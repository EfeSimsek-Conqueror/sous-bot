# Sousbot — Supabase backend

## Project

| | |
|---|---|
| Name | `sousbot` |
| Ref | `bzguhwqrynjvogrubiny` |
| Region | `eu-central-1` (Frankfurt — closest to Istanbul) |
| Plan | Free tier |
| URL | `https://bzguhwqrynjvogrubiny.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/bzguhwqrynjvogrubiny |
| Org | `SimsekEfeSerkan's Org` (`tpteapkscgtjtqvgtasp`) |

## Keys & secrets

All live in `/home/Koragan/projects/sousbot/.env.local` (gitignored, never commit it):

| Var | What it is | Where it's used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL | Web client, Edge Functions |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy `anon` JWT — safe to ship in client bundles, RLS enforced | Web/iOS/Android clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy `service_role` JWT — bypasses RLS entirely | Edge Functions only, **never** in any client |
| `SUPABASE_PROJECT_REF` | `bzguhwqrynjvogrubiny` | CLI linking, management API calls |
| `SUPABASE_DB_PASSWORD` | Postgres password for the `postgres` role | `supabase link` / `db push` / direct `psql` |
| `SUPABASE_DB_URL` | Full pooled (pgbouncer, transaction mode, port 6543) connection string | scripts/ORMs that need raw SQL access |
| `SUPABASE_ACCESS_TOKEN` | Personal management-API token (`sbp_...`) | CLI auth, `api.supabase.com/v1/...` calls — treat like a root password |
| `FAL_KEY` | fal.ai API key | Edge Functions doing ingredient detection / recipe generation / dish image generation |

The dashboard also exposes newer-style `sb_publishable_...` / `sb_secret_...` keys for this
project (same permissions as anon/service_role respectively) — the legacy JWT-format keys above
were chosen because they're what `@supabase/supabase-js` and most client SDKs expect by default.
Both key pairs work; don't need both, but don't delete the legacy pair without updating `.env.local`.

## Schema

Migrations live in `supabase/migrations/`:

- `0001_init.sql` — all 9 tables, indexes, RLS policies, `updated_at` triggers, the
  `auth.users` → `profiles`+`subscriptions` bootstrap trigger, and the atomic
  `increment_generation_usage(p_user_id, p_period)` RPC.
- `0002_storage.sql` — `fridge-photos` (private) and `dish-images` (public) buckets +
  their `storage.objects` RLS policies (user-scoped by `{user_id}/...` path prefix).

### Tables
`profiles`, `recipes`, `taste_events`, `pantry_items`, `meal_plans`, `meal_plan_entries`,
`shopping_list_items`, `subscriptions`, `usage_counters` — see `0001_init.sql` for exact columns,
this mirrors the PRD "Data model" section 1:1.

### RLS model
- Every table has RLS **enabled**.
- Owner-scoped tables (`profiles`, `recipes`, `taste_events`, `pantry_items`, `meal_plans`,
  `shopping_list_items`): full CRUD where `user_id = auth.uid()` (`id = auth.uid()` for `profiles`).
- `meal_plan_entries` has no `user_id` column of its own — its policies check ownership via
  `EXISTS (... meal_plans mp WHERE mp.id = plan_id AND mp.user_id = auth.uid())`.
- `subscriptions` / `usage_counters`: **SELECT-only** policy for the owning user. No
  INSERT/UPDATE/DELETE policy exists for `authenticated`/`anon` — writes only happen via the
  `service_role` key (Edge Functions), which bypasses RLS entirely by design, or via the
  `increment_generation_usage` RPC (see below), which is itself locked to `service_role`.

### Usage metering RPC
```sql
select increment_generation_usage(p_user_id := '<uuid>', p_period := '2026-07');
```
Does a single `INSERT ... ON CONFLICT (user_id, period) DO UPDATE SET generation_count =
generation_count + 1 ... RETURNING generation_count` — atomic under concurrent calls, no
read-then-write race. `SECURITY DEFINER`, execute grant restricted to `service_role` only
(`REVOKE ALL ... FROM PUBLIC` then `GRANT EXECUTE ... TO service_role`). Call it from the
generation Edge Function using the service-role client.

### Storage
- `fridge-photos` (private): user can read/write/delete only objects at
  `fridge-photos/{user_id}/...`. No public access.
- `dish-images` (public): anyone can read (public dish photo URLs), but only the owning user
  (or `service_role`, i.e. the image-generation Edge Function) can write/delete under
  `dish-images/{user_id}/...`.

## Re-applying / adding migrations

```bash
npm i -g supabase          # CLI, if not already installed
cd /home/Koragan/projects/sousbot
export SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>   # or source .env.local

# one-time per machine: link the local supabase/ config to the remote project
supabase link --project-ref bzguhwqrynjvogrubiny -p "$SUPABASE_DB_PASSWORD"

# after adding a new supabase/migrations/000N_*.sql file:
supabase db push -p "$SUPABASE_DB_PASSWORD"
```

You can also run SQL ad hoc through the management API without the CLI:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/bzguhwqrynjvogrubiny/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select 1;"}'
```

(A `docker`/`runc` warning about "failed to cache migrations catalog" during `db push` is
harmless on this box — there's no local Docker runtime — the migration still applies to the
remote database.)

## Deploying Edge Functions

Edge Functions are **not** part of this provisioning pass (a separate agent builds them under
`supabase/functions/`). Once they exist:

```bash
cd /home/Koragan/projects/sousbot
export SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>

# deploy a single function
supabase functions deploy detect-ingredients --project-ref bzguhwqrynjvogrubiny

# deploy all functions under supabase/functions/
supabase functions deploy --project-ref bzguhwqrynjvogrubiny

# set secrets the functions need (service role key is injected automatically by Supabase;
# anything else — like FAL_KEY — must be set explicitly):
supabase secrets set FAL_KEY=<value> --project-ref bzguhwqrynjvogrubiny
```

## Auth

- **Email auth is enabled** (`external_email_enabled: true`, on by default for a new project,
  verified via `GET /v1/projects/{ref}/config/auth`). Signup is not disabled
  (`disable_signup: false`).
- **Google and Apple sign-in are intentionally left unconfigured** (`external_google_enabled:
  false`, `external_apple_enabled: false`) — the PRD/HANDOFF says these are wired later and, until
  then, client auth buttons should be mocked (tap → skip to next screen).

### To enable Google later
1. Dashboard → Authentication → Sign In / Providers → Google, or via the management API:
   ```bash
   curl -X PATCH "https://api.supabase.com/v1/projects/bzguhwqrynjvogrubiny/config/auth" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
     -d '{"external_google_enabled": true, "external_google_client_id": "<id>", "external_google_secret": "<secret>"}'
   ```
2. You need a Google Cloud OAuth client (Web application type) with the Supabase callback URL
   as an authorized redirect URI: `https://bzguhwqrynjvogrubiny.supabase.co/auth/v1/callback`.
3. For native (iOS/Android) one-tap sign-in you'll also want the platform-specific client IDs
   added to `external_google_additional_client_ids`.

### To enable Apple later
1. Dashboard → Authentication → Sign In / Providers → Apple, or via the same `PATCH
   /v1/projects/{ref}/config/auth` endpoint with `external_apple_enabled: true`,
   `external_apple_client_id`, and `external_apple_secret` (a signed JWT client secret you
   generate from your Apple Developer "Sign in with Apple" key — Apple secrets expire and need
   periodic regeneration, unlike Google's static secret).
2. Redirect URI to register with Apple: `https://bzguhwqrynjvogrubiny.supabase.co/auth/v1/callback`.
3. iOS native Sign in with Apple additionally needs the app's bundle ID registered as a Services ID
   / associated with the Apple key used above.

## Verification performed at provisioning time

- `information_schema.tables` — all 9 `public` tables present.
- `pg_class.relrowsecurity` — RLS enabled on all 9 tables.
- `pg_policies` — every table has ≥1 policy (4 CRUD policies on owner-scoped tables, 1 SELECT
  policy on `subscriptions`/`usage_counters`).
- Inserted a dummy `auth.users` row → confirmed the trigger auto-created matching `profiles` and
  `subscriptions` (`status = 'free'`) rows.
- Called `increment_generation_usage` twice for that dummy user/period → got back `1`, then `2`.
- Deleted the dummy `auth.users` row → confirmed cascade removed the `profiles`, `subscriptions`,
  and `usage_counters` rows (all counts back to 0).
- `storage.buckets` — `fridge-photos` (`public=false`) and `dish-images` (`public=true`) exist;
  8 `storage.objects` policies present (4 per bucket).
