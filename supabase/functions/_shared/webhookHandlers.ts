// Pure webhook-payload → subscriptions-row logic for both providers, kept separate from HTTP/
// signature plumbing so tests can exercise them directly (call the function, assert on the
// resulting `subscriptions` row) without simulating real HTTP requests.
//
// Both providers write to the SAME `subscriptions` table — the single source of truth per PRD.

// deno-lint-ignore no-explicit-any
type AdminClient = any;

export type SubscriptionStatus = "free" | "pro" | "grace" | "expired";

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Stripe events don't carry a Supabase user id natively — the web checkout flow (built by the
 * web-client agent) must set `metadata.supabase_user_id` (subscription/customer objects) or
 * `client_reference_id` (Checkout Session) to the Supabase auth user's uuid when creating the
 * Checkout Session, so we can map the event back to a user here.
 */
export function extractStripeUserId(obj: Record<string, unknown>): string | null {
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  if (metadata && typeof metadata.supabase_user_id === "string" && metadata.supabase_user_id) {
    return metadata.supabase_user_id;
  }
  if (typeof obj.client_reference_id === "string" && obj.client_reference_id) {
    return obj.client_reference_id;
  }
  return null;
}

function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  if (status === "active" || status === "trialing") return "pro";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "grace";
  return "expired"; // canceled, incomplete_expired, ...
}

/**
 * Applies a Stripe event to the `subscriptions` table. Handles `customer.subscription.*` and
 * `checkout.session.completed`; other event types are acknowledged as a no-op (Stripe expects
 * any 2xx to stop retrying — the HTTP layer returns 200 regardless of whether this changed a row).
 */
export async function applyStripeEvent(admin: AdminClient, event: StripeEvent): Promise<{ applied: boolean; reason?: string }> {
  const obj = event.data.object;
  const userId = extractStripeUserId(obj);
  if (!userId) {
    return { applied: false, reason: "no supabase_user_id in metadata/client_reference_id" };
  }

  let status: SubscriptionStatus;
  let productId: string | null = null;
  let currentPeriodEnd: string | null = null;

  if (event.type.startsWith("customer.subscription.")) {
    status = event.type === "customer.subscription.deleted" ? "expired" : mapStripeSubscriptionStatus(String(obj.status ?? ""));
    const items = (obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined)?.data;
    productId = items?.[0]?.price?.id ?? null;
    if (typeof obj.current_period_end === "number") {
      currentPeriodEnd = new Date(obj.current_period_end * 1000).toISOString();
    }
  } else if (event.type === "checkout.session.completed") {
    status = "pro";
  } else {
    return { applied: false, reason: `unhandled event type: ${event.type}` };
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      status,
      platform: "stripe",
      product_id: productId,
      current_period_end: currentPeriodEnd,
      raw: obj,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Failed to upsert subscription from Stripe event: ${error.message}`);
  return { applied: true };
}

// ---------------------------------------------------------------------------
// RevenueCat
// ---------------------------------------------------------------------------

export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string | null;
  expiration_at_ms?: number | null;
}

export interface RevenueCatPayload {
  event: RevenueCatEvent;
}

function mapRevenueCatStatus(type: string, expirationAtMs: number | null | undefined): SubscriptionStatus {
  const stillEntitled = typeof expirationAtMs === "number" && expirationAtMs > Date.now();
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "TRANSFER":
      return "pro";
    case "CANCELLATION":
      // RevenueCat sends CANCELLATION when auto-renew is turned off — the user keeps access
      // until expiration_at_ms, an EXPIRATION event follows later.
      return stillEntitled ? "pro" : "expired";
    case "BILLING_ISSUE":
      return "grace";
    case "EXPIRATION":
      return "expired";
    default:
      return stillEntitled ? "pro" : "expired";
  }
}

/**
 * Applies a RevenueCat event to the `subscriptions` table. Assumes the iOS/Android client SDKs
 * call `Purchases.logIn(<supabase user id>)` at auth time, per standard RevenueCat<->backend
 * integration, so `app_user_id` IS the Supabase user's uuid.
 */
export async function applyRevenueCatEvent(admin: AdminClient, payload: RevenueCatPayload): Promise<{ applied: boolean; reason?: string }> {
  const evt = payload.event;
  if (!evt?.app_user_id) {
    return { applied: false, reason: "missing app_user_id" };
  }

  const status = mapRevenueCatStatus(evt.type, evt.expiration_at_ms ?? null);
  const currentPeriodEnd = typeof evt.expiration_at_ms === "number" ? new Date(evt.expiration_at_ms).toISOString() : null;

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: evt.app_user_id,
      status,
      platform: "revenuecat",
      product_id: evt.product_id ?? null,
      current_period_end: currentPeriodEnd,
      raw: evt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Failed to upsert subscription from RevenueCat event: ${error.message}`);
  return { applied: true };
}
