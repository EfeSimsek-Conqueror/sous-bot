// Entitlements & usage metering — PRD Test Decisions module 1.
//
// Runs against the REAL remote Supabase project (free tier — no cost) rather than mocking the
// database: the property under test ("concurrent generation requests do not double-spend the
// counter") is a real Postgres row-locking guarantee inside `increment_generation_usage`, and a
// DB mock would only prove our mock behaves atomically, not that the real RPC does. fal.ai is
// never touched by this module, so nothing here needs the fal mock.
//
// Requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in the environment —
// run via: deno test --allow-net --allow-env --env-file=../../../.env.test.local
//
// Each test creates its own throwaway auth user and deletes it in a `finally` (cascades to
// profiles/subscriptions/usage_counters per the 0001_init.sql schema), so tests are independent
// and leave no residue on the shared project.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  checkEntitlement,
  checkAndIncrementGenerationUsage,
  FREE_MONTHLY_GENERATION_LIMIT,
} from "../_shared/entitlements.ts";
import { applyStripeEvent, applyRevenueCatEvent, type StripeEvent, type RevenueCatPayload } from "../_shared/webhookHandlers.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "entitlements.test.ts requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env.test.local",
  );
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function createTestUser(): Promise<string> {
  const email = `sousbot-test-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (error || !data?.user) throw new Error(`Failed to create test user: ${error?.message}`);
  return data.user.id;
}

async function deleteTestUser(userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId);
}

Deno.test("free user: allowed generations 1 through 10, blocked on the 11th", async () => {
  const userId = await createTestUser();
  try {
    const period = `test-${crypto.randomUUID().slice(0, 8)}`; // isolated period so this test can't collide with others
    for (let i = 1; i <= FREE_MONTHLY_GENERATION_LIMIT; i++) {
      const result = await checkAndIncrementGenerationUsage(admin, userId, { isPro: false, period });
      assertEquals(result.allowed, true, `generation ${i} should be allowed`);
      assertEquals(result.count, i);
    }

    const eleventh = await checkAndIncrementGenerationUsage(admin, userId, { isPro: false, period });
    assertEquals(eleventh.allowed, false, "the 11th generation must be blocked");
    assertEquals(eleventh.count, FREE_MONTHLY_GENERATION_LIMIT);

    const { data: row } = await admin
      .from("usage_counters")
      .select("generation_count")
      .eq("user_id", userId)
      .eq("period", period)
      .single();
    assertEquals(row?.generation_count, FREE_MONTHLY_GENERATION_LIMIT, "counter must not run away past the limit");
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("free user: counter resets on a new period", async () => {
  const userId = await createTestUser();
  try {
    const periodA = `test-a-${crypto.randomUUID().slice(0, 8)}`;
    const periodB = `test-b-${crypto.randomUUID().slice(0, 8)}`;

    for (let i = 0; i < FREE_MONTHLY_GENERATION_LIMIT; i++) {
      await checkAndIncrementGenerationUsage(admin, userId, { isPro: false, period: periodA });
    }
    const blockedInA = await checkAndIncrementGenerationUsage(admin, userId, { isPro: false, period: periodA });
    assertEquals(blockedInA.allowed, false);

    // A new period is a fresh counter, independent of period A's exhausted limit.
    const firstInB = await checkAndIncrementGenerationUsage(admin, userId, { isPro: false, period: periodB });
    assertEquals(firstInB.allowed, true);
    assertEquals(firstInB.count, 1);
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("Pro user: unmetered — allowed well past the free-tier limit", async () => {
  const userId = await createTestUser();
  try {
    const period = `test-${crypto.randomUUID().slice(0, 8)}`;
    for (let i = 1; i <= FREE_MONTHLY_GENERATION_LIMIT + 5; i++) {
      const result = await checkAndIncrementGenerationUsage(admin, userId, { isPro: true, period });
      assertEquals(result.allowed, true, `Pro generation ${i} should always be allowed`);
      assertEquals(result.limit, null);
    }
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("checkEntitlement: fresh user defaults to free/not-Pro", async () => {
  const userId = await createTestUser();
  try {
    const ent = await checkEntitlement(admin, userId);
    assertEquals(ent.status, "free");
    assertEquals(ent.isPro, false);
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("checkEntitlement: reflects a 'pro' subscriptions row", async () => {
  const userId = await createTestUser();
  try {
    await admin.from("subscriptions").update({ status: "pro", platform: "stripe" }).eq("user_id", userId);
    const ent = await checkEntitlement(admin, userId);
    assertEquals(ent.status, "pro");
    assertEquals(ent.isPro, true);
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("concurrent generation requests do not double-spend the counter (real atomic RPC)", async () => {
  const userId = await createTestUser();
  try {
    const period = `test-${crypto.randomUUID().slice(0, 8)}`;
    const CONCURRENCY = 25;

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => checkAndIncrementGenerationUsage(admin, userId, { isPro: false, period })),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    const blockedCount = results.filter((r) => !r.allowed).length;

    assertEquals(allowedCount, FREE_MONTHLY_GENERATION_LIMIT, "exactly 10 of the concurrent requests must succeed");
    assertEquals(blockedCount, CONCURRENCY - FREE_MONTHLY_GENERATION_LIMIT);

    const { data: row } = await admin
      .from("usage_counters")
      .select("generation_count")
      .eq("user_id", userId)
      .eq("period", period)
      .single();
    assertEquals(row?.generation_count, FREE_MONTHLY_GENERATION_LIMIT, "final counter must be exactly the limit, never more");
  } finally {
    await deleteTestUser(userId);
  }
});

// ---------------------------------------------------------------------------
// Webhook payload shapes -> subscriptions state (both providers, one source of truth table)
// ---------------------------------------------------------------------------

Deno.test("Stripe webhook: customer.subscription.updated (active) sets status='pro'", async () => {
  const userId = await createTestUser();
  try {
    const event: StripeEvent = {
      id: "evt_test_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          items: { data: [{ price: { id: "price_pro_monthly" } }] },
          metadata: { supabase_user_id: userId },
        },
      },
    };
    const result = await applyStripeEvent(admin, event);
    assert(result.applied);

    const { data } = await admin.from("subscriptions").select("status, platform, product_id").eq("user_id", userId).single();
    assertEquals(data?.status, "pro");
    assertEquals(data?.platform, "stripe");
    assertEquals(data?.product_id, "price_pro_monthly");
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("Stripe webhook: customer.subscription.deleted sets status='expired'", async () => {
  const userId = await createTestUser();
  try {
    const event: StripeEvent = {
      id: "evt_test_2",
      type: "customer.subscription.deleted",
      data: { object: { status: "canceled", metadata: { supabase_user_id: userId } } },
    };
    await applyStripeEvent(admin, event);
    const { data } = await admin.from("subscriptions").select("status").eq("user_id", userId).single();
    assertEquals(data?.status, "expired");
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("Stripe webhook: event with no supabase_user_id is a documented no-op, not a throw", async () => {
  const event: StripeEvent = {
    id: "evt_test_orphan",
    type: "customer.subscription.updated",
    data: { object: { status: "active" } },
  };
  const result = await applyStripeEvent(admin, event);
  assertEquals(result.applied, false);
});

Deno.test("RevenueCat webhook: INITIAL_PURCHASE sets status='pro'", async () => {
  const userId = await createTestUser();
  try {
    const payload: RevenueCatPayload = {
      event: {
        id: "rc_evt_1",
        type: "INITIAL_PURCHASE",
        app_user_id: userId,
        product_id: "sousbot_pro_monthly",
        expiration_at_ms: Date.now() + 30 * 24 * 3600 * 1000,
      },
    };
    const result = await applyRevenueCatEvent(admin, payload);
    assert(result.applied);

    const { data } = await admin.from("subscriptions").select("status, platform, product_id").eq("user_id", userId).single();
    assertEquals(data?.status, "pro");
    assertEquals(data?.platform, "revenuecat");
    assertEquals(data?.product_id, "sousbot_pro_monthly");
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("RevenueCat webhook: EXPIRATION sets status='expired'", async () => {
  const userId = await createTestUser();
  try {
    const payload: RevenueCatPayload = {
      event: { id: "rc_evt_2", type: "EXPIRATION", app_user_id: userId, expiration_at_ms: Date.now() - 1000 },
    };
    await applyRevenueCatEvent(admin, payload);
    const { data } = await admin.from("subscriptions").select("status").eq("user_id", userId).single();
    assertEquals(data?.status, "expired");
  } finally {
    await deleteTestUser(userId);
  }
});

Deno.test("RevenueCat webhook: BILLING_ISSUE sets status='grace' (still counts as Pro-entitled)", async () => {
  const userId = await createTestUser();
  try {
    const payload: RevenueCatPayload = {
      event: { id: "rc_evt_3", type: "BILLING_ISSUE", app_user_id: userId, expiration_at_ms: Date.now() + 3600_000 },
    };
    await applyRevenueCatEvent(admin, payload);
    const ent = await checkEntitlement(admin, userId);
    assertEquals(ent.status, "grace");
    assertEquals(ent.isPro, true, "grace period must still be treated as entitled");
  } finally {
    await deleteTestUser(userId);
  }
});
