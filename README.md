# Sousbot

AI kitchen app (`sousbot.ai`). Photo of your fridge → detected ingredients →
AI-generated recipes with macros + a generated dish photo → meal plans → shopping list.

## Monorepo layout

```
apps/web/         Next.js (App Router, TypeScript) — the web app + marketing landing page
apps/android/     Native Kotlin + Jetpack Compose
supabase/         Postgres schema (migrations), RLS, Storage, and Edge Functions
_design/          Design source (PRD.md, tokens.json, screen references)
DESIGN.md         Extracted design tokens + screen inventory
brand/            Logo, app icon, favicon (#D68D50)
```

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js (App Router) |
| Android | Native Kotlin + Jetpack Compose |
| Backend | Supabase — Postgres + Auth + Storage + Edge Functions (Deno) |
| AI | [fal.ai](https://fal.ai) for text (recipes/plans/macros), vision (ingredient detection), and image (dish photos) |
| Brand | `#D68D50` accent, glass UI, Instrument Serif + Schibsted Grotesk |

## Getting started

1. **Copy env:** `cp .env.example apps/web/.env.local` and fill in the values
   (ask a maintainer for the Supabase project ref + keys). Edge Function secrets
   are set separately with `supabase secrets set` — see `supabase/README.md`.
2. **Web:**
   ```bash
   cd apps/web
   npm install
   npm run dev        # http://localhost:5173
   npm run build      # uses next build --webpack
   ```
3. **Android:** open `apps/android` in Android Studio (JDK 21, Android SDK
   platform-35). See `apps/android/README.md`.
4. **Backend:** schema + functions docs in `supabase/README.md` and
   `supabase/functions/README.md`.

## Deployment

The web app deploys to **Railway** (root directory `apps/web`, auto-deploys on
push to `main`). The three `NEXT_PUBLIC_*` values are set as Railway service
environment variables.

## Security

No credentials live in this repo. All secrets are provided via gitignored
`.env` / `.env.local` files (web) and `supabase secrets` (Edge Functions).
See `.env.example` for the full list. Never commit real keys.
