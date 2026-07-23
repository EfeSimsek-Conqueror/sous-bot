# Sousbot Edge Functions — API Reference

This is the entire server-side API for Sousbot. Every client (web, iOS, Android) is thin and
talks **only** to these endpoints — no client ever calls fal.ai or holds an AI key. All AI
traffic, entitlement checks, and usage metering happen here.

Base URL: `https://bzguhwqrynjvogrubiny.supabase.co/functions/v1/<function-name>`

## Auth (applies to every endpoint except the two webhooks)

Every request must carry a Supabase user session JWT:

```
Authorization: Bearer <supabase user access_token>
apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>
```

The function derives `user_id` from this JWT server-side (`auth.getUser()` against Supabase
Auth) — it is **never** taken from the request body. Sending a JWT for user A and a body field
claiming to be user B has no effect; the JWT always wins.

Missing/invalid/expired token → `401 { "error": { "code": "unauthorized", ... } }`.

## Error envelope

Every error response has this shape, with a meaningful HTTP status:

```json
{ "error": { "code": "generation_limit_reached", "message": "Free tier limit of 10 generations/month reached." } }
```

| code | status | meaning |
|---|---|---|
| `unauthorized` | 401 | missing/invalid JWT |
| `forbidden` | 403 | authenticated, but not allowed to touch this resource (e.g. someone else's recipe) |
| `forbidden_not_pro` | 402 | Pro-gated endpoint, caller is not Pro — **client should route to the upgrade screen** |
| `generation_limit_reached` | 402 | free-tier monthly generation limit hit — **client should route to the upgrade screen** |
| `bad_request` | 400 | malformed/missing request fields |
| `not_found` | 404 | resource doesn't exist (or isn't yours) |
| `allergy_violation` | 502 | could not produce output respecting allergy constraints after retries — surface as "please try again" |
| `upstream_invalid_output` | 502 | the AI model never returned valid/schema-matching JSON after retries — surface as "please try again" |
| `upstream_ai_error` | 502 | fal.ai call itself failed (network/5xx) |
| `internal_error` | 500 | unexpected server error |

`402`/`403` codes are the two the client needs to branch on specifically (upgrade screen vs.
generic "not allowed"); everything else is fine to show as a generic error toast.

## Gating summary

| Endpoint | Auth | Gating |
|---|---|---|
| `POST /detect-ingredients` | required | none |
| `POST /generate-recipes` | required | free: 10/month, then `402 generation_limit_reached`; Pro: unlimited |
| `POST /generate-dish-image` | required | Pro only, server-enforced (`402 forbidden_not_pro`) |
| `POST /dish-image-status` | required | Pro only |
| `POST /generate-meal-plan` | required | Pro only |
| `POST /adapt-recipe` | required | Pro only |
| `POST /webhooks/stripe` | provider signature (no user JWT) | n/a |
| `POST /webhooks/revenuecat` | provider auth token (no user JWT) | n/a |

CORS is open to `http://localhost:3000`, `http://localhost:5173`, `https://sousbot.app`, and
`https://www.sousbot.app` by default (see `_shared/cors.ts`); add more via the
`CORS_EXTRA_ORIGINS` secret (comma-separated) if the web app deploys elsewhere.

---

## `POST /detect-ingredients`

Not metered, not gated — any authenticated user can call this freely.

**Request** — provide exactly one of `image_base64` or `storage_path`:

```ts
{
  image_base64?: string;      // raw base64, or a full "data:image/...;base64,..." URI
  image_mime_type?: string;   // e.g. "image/jpeg" — used only if image_base64 is raw (not a data URI); default "image/jpeg"
  storage_path?: string;      // path within the private `fridge-photos` bucket, MUST start with "<your_user_id>/"
}
```

**Response `200`:**

```json
{ "ingredients": ["milk", "yogurt", "chocolate", "cheese", "meat", "jam", "ketchup", "banana", "coconut"] }
```

**Real example (verified against the deployed function):**

```bash
curl -X POST "https://bzguhwqrynjvogrubiny.supabase.co/functions/v1/detect-ingredients" \
  -H "Authorization: Bearer $USER_JWT" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"image_base64":"<base64 jpeg bytes>","image_mime_type":"image/jpeg"}'
```
→ `200 {"ingredients":["milk","yogurt","chocolate","cheese","meat","jam","ketchup","banana","coconut"]}`
(tested end-to-end against a real fridge photo, ~4s response time)

**Errors:** `400 bad_request` (neither field provided, or malformed body), `403 forbidden`
(`storage_path` outside your own folder), `404 not_found` (`storage_path` doesn't resolve),
`502 upstream_invalid_output` (the vision model never returned a valid ingredient array after
2 retries — see "JSON reliability" below).

**Implementation notes:** uses fal.ai `openrouter/router/vision` (`google/gemini-2.5-flash`,
falls back to `openai/gpt-4o` on the final retry). Markdown code fences the model sometimes
wraps its output in are stripped automatically before parsing (`_shared/jsonRetry.ts`).

---

## `POST /generate-recipes`

**Gated + metered.** Free tier: 10 generations/month, enforced atomically via the
`increment_generation_usage` Postgres RPC (concurrency-safe — see Testing section). Pro:
unlimited. Injects the caller's diet flags, allergies, and an aggregated taste profile
(from `taste_events`) into the prompt. Allergies are a hard constraint, re-validated after
generation — a violating recipe is discarded and regenerated (up to 3 total rounds) before
ever being stored or returned.

**Request:**

```ts
{
  ingredients: string[];       // required, non-empty
  n?: number;                  // default 3, max 6
  constraints?: {
    diet?: string;              // ad-hoc override/addition to the profile's diet_flags for this call
    leftover_rescue?: boolean;  // prioritize using up ALL listed ingredients (food-waste mode)
  };
}
```

**Response `200`:**

```ts
{
  recipes: Array<{
    id: string; title: string; description: string;
    ingredients: { name: string; quantity: number; unit: string }[];
    steps: string[];
    macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    prep_minutes: number; cook_minutes: number; servings: number;
    difficulty: "easy" | "medium" | "hard"; tags: string[];
    image_url: string | null; image_status: "none" | "pending" | "ready" | "failed";
    created_at: string;
  }>;
  usage: { used: number; limit: number | null; remaining: number | null }; // limit/remaining are null when Pro (unmetered)
}
```

Recipes are persisted to the `recipes` table (`source = "generated"`) before being returned —
the `id`s in the response are real DB ids, usable immediately by `generate-dish-image`,
`adapt-recipe` (`recipe_id`), etc.

**Real example (verified against the deployed function, real fal.ai call):**

```bash
curl -X POST ".../functions/v1/generate-recipes" \
  -H "Authorization: Bearer $USER_JWT" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"ingredients":["chicken breast","garlic","lemon","olive oil","rice"],"n":2}'
```
→ `200`, in ~6.7s:
```json
{
  "recipes": [
    {
      "id": "467821c6-4077-4392-9b76-66c545ad64f3",
      "title": "Lemon Garlic Chicken with Rice",
      "description": "A simple and flavorful dish featuring tender chicken breast marinated in lemon and garlic, served over fluffy rice.",
      "ingredients": [
        {"name":"chicken breast","unit":"pieces","quantity":2},
        {"name":"garlic","unit":"cloves","quantity":3},
        {"name":"lemon","unit":"whole","quantity":1},
        {"name":"olive oil","unit":"tbsp","quantity":2},
        {"name":"rice","unit":"cup","quantity":1}
      ],
      "steps": ["Mince the garlic. Zest half of the lemon and then juice the entire lemon.", "..."],
      "macros": {"fat_g":20,"carbs_g":50,"calories":550,"protein_g":45},
      "prep_minutes": 20, "cook_minutes": 25, "servings": 2, "difficulty": "easy",
      "tags": ["chicken","lemon","garlic","rice","easy"],
      "image_url": null, "image_status": "none",
      "created_at": "2026-07-22T21:50:19.776502+00:00"
    }
  ],
  "usage": { "used": 1, "limit": 10, "remaining": 9 }
}
```
(verified: `usage_counters` row for this user/period read back as `generation_count = 1`
immediately after this call, via direct DB query)

**On the 11th free-tier call in a period** (verified live by seeding the counter to 10):
→ `402`:
```json
{ "error": { "code": "generation_limit_reached", "message": "Free tier limit of 10 generations/month reached." } }
```

**Errors:** `400 bad_request` (empty/missing `ingredients`), `402 generation_limit_reached`,
`502 upstream_invalid_output`, `502 allergy_violation` (couldn't produce any allergen-safe
recipe after 3 rounds — very rare, means the request is nearly impossible to satisfy).

---

## `POST /generate-dish-image`

**Pro-gated, server-enforced** — a free user is refused (`402 forbidden_not_pro`) even if the
client tries anyway (verified live). **Async**: submits to the fal.ai queue and returns
immediately; call again (or poll `/dish-image-status`) to advance/complete the job. Idempotent
— safe to call repeatedly for the same recipe.

**Request:**

```ts
{ recipe_id: string }   // must be a recipe you own
```

**Response:** `200` if already `ready` (or just finished on this call), `202` if the job was
just submitted or is still in progress:

```json
{ "image_status": "pending" | "ready" | "failed", "image_url": "https://.../dish-images/<user_id>/<recipe_id>.jpg" | null }
```

**Real example (verified against the deployed function, real fal.ai queue job, real upload):**

```bash
curl -X POST ".../functions/v1/generate-dish-image" \
  -H "Authorization: Bearer $PRO_USER_JWT" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"recipe_id":"467821c6-4077-4392-9b76-66c545ad64f3"}'
```
→ `202 {"image_status":"pending","image_url":null}` (job submitted, ~instant)

Polling `/dish-image-status` with the same `recipe_id` 3 times at 3s intervals:
```
poll 1: 200 {"image_status":"pending","image_url":null}
poll 2: 200 {"image_status":"pending","image_url":null}
poll 3: 200 {"image_status":"ready","image_url":"https://bzguhwqrynjvogrubiny.supabase.co/storage/v1/object/public/dish-images/807935c0-.../467821c6-....jpg"}
```
The final URL was fetched directly and confirmed `200`, `content-type: image/jpeg`, 1.2MB —
a real, appetising dish photo, downloaded from fal and re-uploaded into the `dish-images`
bucket by the function.

**Free-user refusal (verified live):**
```json
{ "error": { "code": "forbidden_not_pro", "message": "This feature requires a Pro subscription." } }
```
→ `402`

**Errors:** `400 bad_request` (`recipe_id` missing), `402 forbidden_not_pro`, `403 forbidden`
(not your recipe), `404 not_found`.

---

## `POST /dish-image-status`

Poll-only counterpart to `generate-dish-image` — never submits a new job, just checks/advances
an in-flight one. Accepts `GET ?recipe_id=...` or `POST { recipe_id }`. Same response shape and
gating as `generate-dish-image`.

---

## `POST /generate-meal-plan`

**Pro-gated.** Generates a multi-day meal plan and computes the shopping list as
`(plan ingredients) MINUS (pantry items)`, with unit/quantity merging of duplicate ingredients
(pure logic in `_shared/shoppingList.ts`, independently unit-tested). Persists a `meal_plans`
row, one `recipes` row per meal, `meal_plan_entries` linking them, and the resulting
`shopping_list_items`.

**Request:**

```ts
{
  days?: number;                // default 7, max 7
  meals_per_day?: number;       // default 3, max 5
  macro_targets?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
  pantry?: { name: string; quantity?: number | null; unit?: string | null; is_staple?: boolean }[];
  // ^ optional override — omit to use the caller's stored `pantry_items` rows
  leftover_rescue?: boolean;
  week_start?: string;          // ISO date, defaults to today
}
```

**Response `200`:**

```ts
{
  meal_plan: {
    id: string; week_start: string;
    days: Array<{
      day: number;
      meals: Array<{ slot: "breakfast" | "lunch" | "dinner" | "snack"; recipe: Recipe /* same shape as generate-recipes */ }>;
      daily_macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    }>;
  };
  shopping_list: Array<{ id: string; name: string; quantity: number | null; unit: string | null; checked: boolean; source_plan_id: string }>;
}
```

**Errors:** `402 forbidden_not_pro`, `502 upstream_invalid_output`, `502 allergy_violation`.

**Pantry/staple semantics** (see `_shared/shoppingList.ts`, unit tested): a pantry item flagged
`is_staple` (e.g. salt, oil) always fully covers that ingredient regardless of the plan's
requested quantity/unit — "don't tell me to buy salt." An unquantified pantry item ("have some,
unspecified amount") is treated the same way. Mass units (g/kg/oz/lb) and volume units
(ml/l/tsp/tbsp/cup) are converted for comparison; count-style units (pieces, cloves, ...) only
match/merge on exact unit string.

---

## `POST /adapt-recipe`

**Pro-gated.** Adapts a recipe for a requested transformation (vegan, half portions,
substitution, air-fryer, ...), respecting the caller's allergy flags (same hard-constraint +
post-generation re-validation pattern as `generate-recipes`). Provide exactly one source:

**Request:**

```ts
{
  recipe_id?: string;         // adapt one of your own saved recipes
  url?: string;                // best-effort: fetches the page, strips HTML, feeds the extracted text to the model
  image_base64?: string;       // a photographed recipe; extracted via a vision call first
  image_mime_type?: string;
  transformation: string;      // required, e.g. "make it vegan", "half portions", "swap chicken for tofu", "air fryer version"
}
```

**Response `200`:**

```ts
{ recipe: Recipe /* same persisted shape as generate-recipes, source="adapted" */ }
```

**Errors:** `400 bad_request` (`transformation` missing, or none of `recipe_id`/`url`/
`image_base64` given), `402 forbidden_not_pro`, `403 forbidden` (recipe_id not yours),
`404 not_found`, `502 upstream_invalid_output`, `502 allergy_violation`.

**Note on `url` extraction:** this is best-effort HTML-tag-stripping + a single LLM call asked
to parse-then-adapt in one step — there's no dedicated recipe-scraper library involved. Works
well for text-heavy recipe blogs; may need iteration for JS-rendered recipe sites (out of scope
for this pass — the contract/shape won't need to change if extraction is swapped out later).

---

## `POST /webhooks/stripe` and `POST /webhooks/revenuecat`

Both write to the **same** `subscriptions` table (one source of truth, keyed by `user_id`).
Deployed as a single Edge Function (`webhooks`) with internal path routing, since both paths
share the `/webhooks/` prefix. **These two do NOT require a Supabase user JWT** — Stripe/
RevenueCat aren't Supabase sessions; the platform-level JWT gate is disabled for this function
in `supabase/config.toml` (`[functions.webhooks] verify_jwt = false`), and trust instead comes
from the provider's own signature/token (see below). This is the one intentional exception to
"every function verifies the caller's JWT."

### `POST /webhooks/stripe`

Handles `customer.subscription.created|updated|deleted` and `checkout.session.completed`.
Maps Stripe subscription `status` → our `subscriptions.status`:
`active`/`trialing` → `pro`; `past_due`/`unpaid`/`incomplete` → `grace`; everything else
(including `customer.subscription.deleted`) → `expired`.

**Requires** the Stripe object's `metadata.supabase_user_id` (or `client_reference_id` on a
Checkout Session) to carry the Supabase auth user's uuid — set this when the web client creates
the Checkout Session. Events without it are acknowledged as a no-op (logged, not an error —
Stripe expects 2xx or it retries indefinitely).

```json
// example inbound payload shape (data.object trimmed)
{
  "id": "evt_...", "type": "customer.subscription.updated",
  "data": { "object": {
    "status": "active", "current_period_end": 1793750000,
    "items": { "data": [{ "price": { "id": "price_pro_monthly" } }] },
    "metadata": { "supabase_user_id": "807935c0-358e-4cb9-898b-f086edf412a6" }
  } }
}
```
→ `200 { "received": true, "applied": true }` and `subscriptions` row becomes
`{ status: "pro", platform: "stripe", product_id: "price_pro_monthly", current_period_end: ... }`
(verified against the real `subscriptions` table in automated tests, see Testing below).

**⚠️ TODO before production traffic:** `STRIPE_WEBHOOK_SECRET` is not yet provisioned (no
Stripe account/keys exist as of this build). Signature verification in
`supabase/functions/webhooks/index.ts` (`verifyStripeSignature`) currently **fails open**
(accepts unsigned payloads) specifically so the endpoint is buildable/testable today. Once you
have a Stripe webhook signing secret:
1. `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref bzguhwqrynjvogrubiny`
2. Fill in real verification in `verifyStripeSignature` (the `stripe` npm package via esm.sh, or
   a manual HMAC-SHA256 check per Stripe's docs) — everything else in the pipeline is unchanged.

### `POST /webhooks/revenuecat`

Handles RevenueCat's standard webhook event types. Maps `event.type` → status:
`INITIAL_PURCHASE`/`RENEWAL`/`UNCANCELLATION`/`PRODUCT_CHANGE`/`TRANSFER` → `pro`;
`CANCELLATION` → `pro` if `expiration_at_ms` is still in the future, else `expired` (RC sends
CANCELLATION on auto-renew-off, entitlement continues until expiry); `BILLING_ISSUE` → `grace`;
`EXPIRATION` → `expired`.

**Assumes** the iOS/Android client SDKs call `Purchases.logIn(<supabase user id>)` at auth time
(standard RevenueCat integration pattern), so `event.app_user_id` IS the Supabase user's uuid.

```json
{
  "event": {
    "id": "rc_evt_1", "type": "INITIAL_PURCHASE",
    "app_user_id": "807935c0-358e-4cb9-898b-f086edf412a6",
    "product_id": "sousbot_pro_monthly",
    "expiration_at_ms": 1793750000000
  }
}
```
→ `200 { "received": true, "applied": true }` and `subscriptions` row becomes
`{ status: "pro", platform: "revenuecat", product_id: "sousbot_pro_monthly", current_period_end: ... }`
(verified in automated tests).

**⚠️ TODO before production traffic:** `REVENUECAT_WEBHOOK_AUTH_TOKEN` is not yet provisioned.
RevenueCat webhooks authenticate via a static `Authorization: Bearer <token>` you configure once
in the RC dashboard (Project Settings → Integrations → Webhooks). Verification in
`verifyRevenueCatAuth` currently fails open the same way as Stripe's, for the same reason. Once
you've set the token in the dashboard: `supabase secrets set REVENUECAT_WEBHOOK_AUTH_TOKEN=<token>
--project-ref bzguhwqrynjvogrubiny` — no code change needed, the check already looks for it.

---

## Shared modules (`_shared/`)

| File | Purpose |
|---|---|
| `cors.ts` | CORS headers + preflight handling |
| `errors.ts` | `ApiError`, error codes, the `{ error: { code, message } }` envelope |
| `handler.ts` | `withHandler()` wraps every `Deno.serve` callback: CORS preflight + error catch-all |
| `supabaseAdmin.ts` | `getAdminClient()` (service_role) + `requireUser(req)` (verifies JWT, returns `user_id`) |
| `fal.ts` | fal.ai client (text/vision/image, queue submit+poll) — types and endpoints per `/AI.md` |
| `jsonRetry.ts` | `parseWithRetry()` — strips markdown fences, validates, retries the model call up to 2x, never returns broken JSON |
| `recipeSchema.ts` | `Recipe` type + `validateRecipe`/`validateRecipeList` structural validators |
| `mealPlanSchema.ts` | `MealPlan` type + `validateMealPlan` |
| `allergens.ts` | `checkAllergyViolations()` — synonym-aware allergen post-check against a generated recipe |
| `entitlements.ts` | **The one shared `checkEntitlement()`/`requirePro()` function used by every gated endpoint**, plus `checkAndIncrementGenerationUsage()` (wraps the atomic `increment_generation_usage` RPC) |
| `shoppingList.ts` | Pure `computeMissingIngredients()` diff — no I/O, independently unit-tested |
| `dishImage.ts` | Dish-image prompt building + fal queue submit/poll/complete + storage upload, shared by `generate-dish-image` and `dish-image-status` |
| `webhookHandlers.ts` | Pure `applyStripeEvent()`/`applyRevenueCatEvent()` — payload → `subscriptions` row, testable without HTTP |

---

## Testing

Automated tests live in `supabase/functions/tests/` (Deno test), covering the three PRD-mandated
modules by calling each module's public interface directly (never internals):

- **`entitlements.test.ts`** — runs against the **real** remote Supabase project (free tier, no
  cost): creates/deletes throwaway auth users per test. Covers: free user allowed generations
  1–10, blocked on the 11th; counter resets on a new period; Pro user unmetered past the limit;
  `checkEntitlement` reflects `free`/`pro`/`grace` correctly; **25 concurrent generation calls
  racing against the real atomic RPC produce exactly 10 allowed + 15 blocked, final counter
  exactly 10** (real Postgres row-lock concurrency, not simulated); both Stripe and RevenueCat
  webhook payload shapes produce the correct `subscriptions` row.
- **`recipeEngine.test.ts`** — pure, fal.ai mocked by directly injecting the "attempt" functions
  `parseWithRetry` calls (no network). Covers: fence-stripping, successful first-try parse,
  retry-on-malformed-JSON, retry-on-schema-invalid-JSON, exhausting all 3 attempts throws and
  never returns/leaks the broken value, and the full allergy reject-then-regenerate round-trip.
- **`shoppingList.test.ts`** — pure, no I/O. Covers: fully missing / fully covered / partially
  covered items, mass and volume unit conversion, duplicate-ingredient merging (same unit and
  cross-unit), staple and unquantified-pantry-item full coverage, case/whitespace-insensitive
  name matching, and non-matching count-unit items staying separate.

### Running the tests

```bash
cd /home/Koragan/projects/sousbot
deno test --allow-net --allow-env --env-file=.env.test.local supabase/functions/tests/
```

`.env.test.local` (gitignored, generate it yourself) remaps `.env.local`'s client-side variable
names to the reserved names the shared modules read (matching what Supabase auto-injects into
deployed functions):
```
SUPABASE_URL=<NEXT_PUBLIC_SUPABASE_URL>
SUPABASE_ANON_KEY=<NEXT_PUBLIC_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>
FAL_KEY=<FAL_KEY>
```

**Last verified run: 42 passed, 0 failed** (12 entitlements/webhooks + 16 recipe engine + 14
shopping list).

---

## Deploying

```bash
cd /home/Koragan/projects/sousbot
export SUPABASE_ACCESS_TOKEN=sbp_...
supabase link --project-ref bzguhwqrynjvogrubiny -p "$SUPABASE_DB_PASSWORD"

# secrets (SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY are auto-injected by Supabase; FAL_KEY is not)
supabase secrets set FAL_KEY=<value> --project-ref bzguhwqrynjvogrubiny

# this box has no working Docker/runc, so bundle server-side instead of locally:
supabase functions deploy --project-ref bzguhwqrynjvogrubiny --use-api
```

New migration in this pass: `migrations/0003_dish_image_job.sql` adds
`image_request_id`/`image_status_url`/`image_response_url` columns to `recipes`, needed so
`generate-dish-image`/`dish-image-status` can poll fal's queue idempotently across separate
invocations (fal's per-request URLs must be reused verbatim, not reconstructed — see `/AI.md`).
Apply it the same way as the others: `supabase db push -p "$SUPABASE_DB_PASSWORD"`.
