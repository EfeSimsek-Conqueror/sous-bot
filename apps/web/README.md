# Sousbot — Web

Next.js (App Router) v1.0 client for Sousbot. Talks only to Supabase — the
7 Edge Functions in `supabase/functions/` for anything AI/gated/metered, and
direct RLS-scoped Postgres reads/writes for everything else. Never calls
fal.ai (or any AI provider) directly; no AI key ever ships to the browser.

## Getting started

```bash
npm install
npm run dev
```

Requires `apps/web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`.

**Dev server port:** the deployed Edge Functions' CORS allowlist (see
`supabase/functions/_shared/cors.ts`) only permits `localhost:3000` and
`localhost:5173` by default (plus the production domain). Run the dev server
on one of those — e.g. `npx next dev -p 5173` — or the `/ingredients` →
generate-recipes call (and every other Edge Function call) will fail with a
CORS preflight error while everything else in the app works fine (direct
Postgres calls aren't subject to the same allowlist).

**Anonymous sign-in must be enabled** on the Supabase project (Auth →
Providers → Anonymous Sign-ins) for the mock-auth flow (`mockSignIn()` in
`lib/auth/auth-context.tsx`) to work — it calls
`supabase.auth.signInAnonymously()`. If disabled, both "Continue with
Apple/Google" buttons fail with `anonymous_provider_disabled`.

## Build

```bash
npm run build
```

Runs `next build --webpack`, not the Turbopack default. Turbopack's
production build fails on this project's `app/icon.png` /
`app/apple-icon.png` / `app/favicon.ico` — these are symlinks into
`../../../brand/` (per the coordinator's "reference brand files by their
public path, don't copy them in" instruction, so the final art drops in
automatically) — with `Cannot find module for page: /icon.png` during page
data collection. Webpack handles the same symlinks without issue and
produces an identical bundle otherwise; `next dev` runs Turbopack as normal
since only the production page-data-collection step is affected.

## Architecture

- **Tokens**: `_design/tokens.json` → `scripts/generate-tokens.mjs` →
  `app/tokens.generated.css` (regenerated automatically via `predev`/
  `prebuild`; never hand-edit the generated file). `app/globals.css` layers
  Tailwind v4 theme mapping + the glass-panel/button/chip component classes
  on top.
- **Fonts**: Instrument Serif (display, always-italic wordmark) + Schibsted
  Grotesk (UI) loaded via `next/font/google` in `app/layout.tsx`, wired to
  the token font-family roles via a small override block in `globals.css`.
- **Auth gate**: `components/AppShell.tsx` renders `WelcomeScreen` for any
  unauthenticated route and the real app tree once a session exists —
  every route is implicitly behind sign-in.
- **Tabs**: `app/page.tsx`, `app/planner/page.tsx`, `app/library/page.tsx`,
  `app/list/page.tsx`, `app/profile/page.tsx` are thin wrappers around
  `components/MainTabs.tsx`, which mounts all 5 tab bodies in a horizontal
  track (`lib/hooks/useSwipeTabs.ts` drives the drag/swipe) — floating glass
  bottom tab bar on mobile, fixed sidebar on desktop, same route order
  driving both.
- **Full-page routes** (not part of the tab swipe track): `/ingredients`
  (camera/typed ingredient review), `/results` (free-tier recipe list),
  `/recipe/[id]` (detail + Adapt bottom sheet + Pro dish-image polling),
  `/cook/[id]` (cooking mode, Wake Lock), `/paywall`.
- **API layer**: `lib/api/client.ts` + `types.ts` — one function per Edge
  Function, request/response shapes mirrored from
  `supabase/functions/README.md` (the live contract). `lib/supabase/client.ts`
  is the direct-table-access client (RLS-scoped).
- **Generation cache**: `lib/state/generationStore.ts` hands the
  just-generated recipes + source ingredients from ingredient-review to
  results/recipe-detail (module memory + sessionStorage, so it survives a
  same-tab hard refresh) — used to compute the have/missing ingredient
  split on recipe detail, since the API doesn't persist that split itself.
- **Bottom sheet**: `components/BottomSheet.tsx` — drag-the-handle-to-dismiss
  with a velocity/distance threshold, used by the recipe-detail "Adapt this
  recipe" flow (`POST /adapt-recipe`, Pro-gated).
- **Mock auth**: Google/Apple buttons on `WelcomeScreen` are styled per
  design but both call `mockSignIn()` →
  `supabase.auth.signInAnonymously()` — a real Supabase user, real
  RLS-scoped data. `TODO(real-auth)`: swap in
  `supabase.auth.signInWithOAuth()` once Google/Apple credentials exist.
- **Billing**: paywall UI is real/priced; the "Start Pro" and
  "Restore purchase" actions are intentionally stubbed with a toast
  (`TODO(stripe/revenuecat)`) since neither provider is wired up server-side
  yet (see `supabase/functions/README.md`'s webhook TODOs).

## Known gaps / honest limitations

- Have/missing ingredients on recipe detail relies on the client-side
  generation cache; a recipe opened from a bookmarked/shared link with no
  cache entry shows everything as "missing" (the API has no server-side
  concept of "the ingredients you had" to fall back to).
- Shopping-list items have no category field in the schema, so the list is
  grouped by "from your plan" vs. "added by you" rather than the
  PRODUCE/DAIRY/PANTRY sections shown in the design mockups.
- Cooking-mode step timer is a fixed 5-minute decorative countdown (no
  duration is parseable from generated step text).
