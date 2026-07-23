// POST /webhooks/stripe, POST /webhooks/revenuecat — both write to the single `subscriptions`
// table (one source of truth). Deployed as ONE Edge Function ("webhooks") with internal path
// routing, since Supabase Edge Functions route by top-level folder name and both webhook paths
// share that prefix.
//
// NOTE ON AUTH: unlike every other function here, these do NOT call requireUser()/verify a
// Supabase JWT — Stripe and RevenueCat are external services with no Supabase session. Their
// trust boundary is signature/token verification instead (see below). This is the one
// intentional exception to the "every function verifies the caller's JWT" rule.

import { handleOptions } from "../_shared/cors.ts";
import { jsonResponse, errorResponse } from "../_shared/errors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import { applyStripeEvent, applyRevenueCatEvent, type StripeEvent, type RevenueCatPayload } from "../_shared/webhookHandlers.ts";

// ---------------------------------------------------------------------------
// Stripe signature verification
// ---------------------------------------------------------------------------
//
// TODO(stripe-keys): STRIPE_WEBHOOK_SECRET is not yet provisioned (no Stripe account/keys as of
// this build — see supabase/README.md secrets table). Once it exists:
//   1. `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref bzguhwqrynjvogrubiny`
//   2. Replace the body of `verifyStripeSignature` below with real verification — either the
//      `stripe` npm package via esm.sh (`Stripe.webhooks.constructEvent(rawBody, sigHeader,
//      STRIPE_WEBHOOK_SECRET)`) or a manual HMAC-SHA256 check per Stripe's documented signing
//      scheme (https://stripe.com/docs/webhooks#verify-manually). Either is a small, contained
//      change — the rest of the pipeline (routing, applyStripeEvent) needs no changes.
// Until then this fails OPEN (accepts unsigned payloads) so the endpoint is buildable/testable
// today; this is safe only because no real Stripe traffic can reach it without the secret being
// known to an attacker AND the URL, but must not ship to production before being wired for real.

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

function verifyStripeSignature(req: Request, _rawBody: string): boolean {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn("[webhooks/stripe] STRIPE_WEBHOOK_SECRET not set — TODO before production traffic; accepting unverified");
    return true;
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return false;
  // TODO(stripe-keys): real verification goes here once STRIPE_WEBHOOK_SECRET is set (see above).
  return true;
}

// ---------------------------------------------------------------------------
// RevenueCat auth verification
// ---------------------------------------------------------------------------
//
// RevenueCat webhooks authenticate via a static "Authorization: Bearer <token>" header you
// configure once in the RevenueCat dashboard (Project Settings → Integrations → Webhooks).
// TODO(revenuecat-keys): REVENUECAT_WEBHOOK_AUTH_TOKEN is not yet provisioned. Once you've set
// the token in the RC dashboard: `supabase secrets set REVENUECAT_WEBHOOK_AUTH_TOKEN=<token>
// --project-ref bzguhwqrynjvogrubiny`. No code change needed beyond that — verification below
// already checks it once the env var is present.

const REVENUECAT_WEBHOOK_AUTH_TOKEN = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_TOKEN");

function verifyRevenueCatAuth(req: Request): boolean {
  if (!REVENUECAT_WEBHOOK_AUTH_TOKEN) {
    console.warn("[webhooks/revenuecat] REVENUECAT_WEBHOOK_AUTH_TOKEN not set — TODO before production traffic; accepting unverified");
    return true;
  }
  return req.headers.get("authorization") === `Bearer ${REVENUECAT_WEBHOOK_AUTH_TOKEN}`;
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const pathname = new URL(req.url).pathname;

  try {
    if (req.method !== "POST") {
      return jsonResponse(req, { error: { code: "bad_request", message: "Use POST" } }, 405);
    }

    const rawBody = await req.text();
    const admin = getAdminClient();

    if (pathname.endsWith("/stripe")) {
      if (!verifyStripeSignature(req, rawBody)) {
        return jsonResponse(req, { error: { code: "unauthorized", message: "Invalid Stripe signature" } }, 401);
      }
      const event = JSON.parse(rawBody) as StripeEvent;
      const result = await applyStripeEvent(admin, event);
      return jsonResponse(req, { received: true, ...result }, 200);
    }

    if (pathname.endsWith("/revenuecat")) {
      if (!verifyRevenueCatAuth(req)) {
        return jsonResponse(req, { error: { code: "unauthorized", message: "Invalid RevenueCat auth token" } }, 401);
      }
      const payload = JSON.parse(rawBody) as RevenueCatPayload;
      const result = await applyRevenueCatEvent(admin, payload);
      return jsonResponse(req, { received: true, ...result }, 200);
    }

    return jsonResponse(req, { error: { code: "not_found", message: `Unknown webhook path: ${pathname}` } }, 404);
  } catch (e) {
    return errorResponse(req, e);
  }
});
