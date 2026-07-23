// THE single shared entitlement check used by every gated endpoint (per PRD: "The entitlement
// check is one shared function"). Also houses the atomic generation-usage metering helper that
// wraps the `increment_generation_usage` RPC.

// deno-lint-ignore no-explicit-any
type AdminClient = any; // SupabaseClient from @supabase/supabase-js — kept loose so tests can
                         // pass a minimal fake implementing only .from()/.rpc() without pulling
                         // in the real SDK's types.

import { ApiError, ErrorCodes } from "./errors.ts";

export type SubscriptionStatus = "free" | "pro" | "grace" | "expired";

export interface Entitlement {
  status: SubscriptionStatus;
  isPro: boolean;
}

const PRO_STATUSES: ReadonlySet<SubscriptionStatus> = new Set(["pro", "grace"]);

/**
 * Reads the caller's row from `subscriptions` (service_role client — bypasses RLS by design,
 * the Edge Function itself is the trust boundary) and returns whether they currently have Pro
 * access. Defensively treats a pro/grace row past its own `current_period_end` as expired, in
 * case a renewal/cancellation webhook was missed.
 */
export async function checkEntitlement(admin: AdminClient, userId: string): Promise<Entitlement> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to read subscription: ${error.message}`);
  }

  const status = (data?.status as SubscriptionStatus) ?? "free";

  if (PRO_STATUSES.has(status) && data?.current_period_end) {
    const isExpired = new Date(data.current_period_end).getTime() < Date.now();
    if (isExpired) return { status: "expired", isPro: false };
  }

  return { status, isPro: PRO_STATUSES.has(status) };
}

/** Throws ApiError(402, forbidden_not_pro) if the caller isn't Pro. Use for fully Pro-gated endpoints. */
export async function requirePro(admin: AdminClient, userId: string): Promise<Entitlement> {
  const ent = await checkEntitlement(admin, userId);
  if (!ent.isPro) {
    throw new ApiError(
      402,
      ErrorCodes.FORBIDDEN_NOT_PRO,
      "This feature requires a Pro subscription.",
    );
  }
  return ent;
}

// ---------------------------------------------------------------------------
// Usage metering (generate-recipes: free tier = 10 generations/month)
// ---------------------------------------------------------------------------

export const FREE_MONTHLY_GENERATION_LIMIT = 10;

/** "YYYY-MM" in UTC — matches the `period` column format used by `increment_generation_usage`. */
export function currentPeriod(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export interface UsageResult {
  allowed: boolean;
  count: number;
  limit: number | null; // null = unmetered (Pro)
}

/**
 * Atomically increments the caller's usage counter via the `increment_generation_usage` RPC
 * (a single INSERT ... ON CONFLICT DO UPDATE ... RETURNING — serialized by Postgres's row lock,
 * so concurrent calls cannot double-spend the counter) and reports whether this generation is
 * allowed under the free-tier limit. Pro callers are unmetered (always allowed) but their usage
 * is still recorded for cost-monitoring purposes.
 */
export async function checkAndIncrementGenerationUsage(
  admin: AdminClient,
  userId: string,
  opts: { isPro: boolean; period?: string; limit?: number },
): Promise<UsageResult> {
  const period = opts.period ?? currentPeriod();
  const limit = opts.limit ?? FREE_MONTHLY_GENERATION_LIMIT;

  const { data, error } = await admin.rpc("increment_generation_usage", {
    p_user_id: userId,
    p_period: period,
  });
  if (error) {
    throw new ApiError(500, ErrorCodes.INTERNAL, `usage increment failed: ${error.message}`);
  }
  const count = data as number;

  if (opts.isPro) {
    return { allowed: true, count, limit: null };
  }

  if (count > limit) {
    // Best-effort cap so the persisted counter doesn't run away on repeated blocked attempts.
    // Not required for correctness (the RPC's UPSERT already makes the increment atomic and
    // therefore prevents any request pair from both "succeeding" past the limit) — this only
    // keeps the number shown to the user ("X of 10 used") sane after they keep hammering a
    // blocked endpoint.
    await admin
      .from("usage_counters")
      .update({ generation_count: limit })
      .eq("user_id", userId)
      .eq("period", period)
      .gt("generation_count", limit);
    return { allowed: false, count: limit, limit };
  }

  return { allowed: true, count, limit };
}

/** Throws ApiError(402, generation_limit_reached) — the code the client routes on to the upgrade screen. */
export function assertUsageAllowed(usage: UsageResult): void {
  if (!usage.allowed) {
    throw new ApiError(
      402,
      ErrorCodes.GENERATION_LIMIT_REACHED,
      `Free tier limit of ${usage.limit} generations/month reached.`,
    );
  }
}
