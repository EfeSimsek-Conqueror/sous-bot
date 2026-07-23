# SOUSBOT — Handoff

> Any new session reads this file first and can resume from any cutoff point without asking questions.

## What this is
**Sousbot** (`sousbot.ai`) — AI kitchen app. Photo of your fridge → detected ingredients → AI-generated
recipes with macros + generated dish photo → meal plans → shopping list. Full PRD at `_design/PRD.md`.

## Locked decisions (do not re-litigate)
| Topic | Decision |
|---|---|
| Name / domain | Sousbot, `sousbot.ai` |
| Brand colour | **`#D68D50`** — replaces the green in the design doc **everywhere**. No green survives. |
| Design source | `_design/Forkful Glass.html` — the **glass** variant is the chosen one |
| Web | Next.js (App Router) → `apps/web` |
| Android | **Native Kotlin + Jetpack Compose** → `apps/android` (user chose native over Capacitor) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| AI provider | **fal.ai for everything** — text (recipes/plans/macros), vision (ingredient detection), image (dish photos). No Gemini. |
| Auth | Google/Apple wired **later**. For now the auth buttons are mock: tap → skip straight to next page. |
| Gestures | Horizontal swipe navigates between pages. Drawer/popup subpages open+close by swiping the top handle. |
| Testing | Automated tests for the 3 PRD modules (entitlements, recipe-engine output, shopping-list diff). UI = visual refine loop. |

## ⚠️ SUPABASE PROJECT CHANGED (2026-07-23, session 8)
**The app now runs on the `food` project `retjqmizcapeplxfznhg` (eu-west-2), NOT the original `sousbot` project `bzguhwqrynjvogrubiny`.** Reason: the collaborator (Efe) set up Google OAuth on `food` (the Google client's authorized redirect URI is `https://retjqmizcapeplxfznhg.supabase.co/auth/v1/callback`), so we made `food` the main. The FULL backend was migrated there via the management API + CLI `--use-api`: all 3 migrations applied (9 tables + RLS + RPCs + `on_auth_user_created` trigger + both storage buckets), all 7 edge functions deployed, secrets set (FAL_KEY, CORS_EXTRA_ORIGINS=https://sous-bot.vercel.app; SUPABASE_* auto-injected), Google + anonymous auth enabled, Site URL + redirect allowlist set. Verified live: Google OAuth no mismatch, generate-recipes 401-gated, anon signup 200. The OLD `bzguhwqrynjvogrubiny` project is now abandoned. **Anywhere in this file that references `bzguhwqrynjvogrubiny` is STALE — use `retjqmizcapeplxfznhg`.** food URL/anon/service keys → `HANDOFF.secrets.md`. Auth is now REAL Google OAuth (PKCE) via a branded sign-in sheet (`apps/web/components/SignInSheet.tsx`) opened from "Get started"; Apple button disabled "Coming soon". supabase client uses flowType pkce + detectSessionInUrl. Vercel env vars must point to `retjqmizcapeplxfznhg` (URL, anon key, functions URL) + redeploy.

## ▶ CURRENT STATE — resume here (end of session 8, 2026-07-23)
- **Web: DONE & live** at `https://sous-bot.vercel.app` (Vercel, from collab repo `EfeSimsek-Conqueror/sous-bot`, deploys on push to its `main`, root dir `apps/web`). Backend = `food` project. Landing page was **replaced** with the user's imported Claude Design (scroll-driven 3D "camera dolly", `apps/web/components/LandingPage.tsx`) — pot hero, how-it-works, features, pricing, final CTA. **Google sign-in works on web** (branded `SignInSheet.tsx` from "Get started"; Apple "Coming soon"). Vercel env vars point at `food` (URL/anon/functions).
- **Android: native Google sign-in wired but NOT WORKING yet (deferred by user).** `WelcomeScreen.kt` = Google primary + Apple "Coming soon". Flow: `GoogleSignInHelper` (Credential Manager `GetSignInWithGoogleOption`, serverClientId = Google **web** client) → `SupabaseAuthClient.signInWithGoogleIdToken` (id_token grant, exception-safe). On the user's phone the account **picker opens, then fails**. Prime suspect: the **Android OAuth client is missing the debug SHA-1 `05:82:…` / package `com.sousbot.app`** (see secrets file) — OR the token exchange. The latest APK now surfaces the real error text; **next session: have the user re-download + retry and read the exact error**, then fix. `local.properties` on this machine points at `food` + has `GOOGLE_WEB_CLIENT_ID`.
- **Android APK debug pipeline: LIVE.** Always-on server on **uss-hariroth** (docker `sousbot-apk`, nginx:alpine, `:8096`). Stable URL `http://192.168.1.102:8096/sousbot-debug.apk` (LAN) / `http://100.101.73.108:8096/…` (Tailscale). Run `scripts/deploy-apk.sh` (uss-enterprise) after any Android change to build + publish. Access details → secrets file.
- **This HANDOFF is now committed to the collab repo** (scrubbed). Secrets moved to `HANDOFF.secrets.md` (gitignored). A colleague's agent reads HANDOFF, follows the `→ HANDOFF.secrets.md` pointers, and asks the owner for that file's values.

## Credentials
🔑 **Every secret/key lives in `HANDOFF.secrets.md` — which is gitignored and NOT in the repo.**
If you just pulled this repo and that file is missing, **ask the owner for it (or the values it holds) before doing any Supabase / fal / Google / deploy / APK-pipeline work.** It contains: the Supabase management token + `food` project URL/anon/service keys, the fal.ai key, the Google OAuth web + android client IDs + web secret + the Android debug SHA-1, the uss-hariroth APK-pipeline access, ntfy, and the git commit identity. Recreate it locally from what the owner shares if needed.

Non-secret reminders (safe to keep here):
- `gh` CLI is authenticated as `Koragan`.
- **Commit author**: `git -c user.email=amirkoragan@gmail.com -c user.name=Koragan commit` (name `Koragan`). The session context/userEmail says `omerbassurucu@gmail.com` — do NOT use that for git authorship.
- **Do not use the Supabase MCP** — use the access token (in the secrets file) against the management API / `supabase` CLI.
- Runtime secrets are read from `apps/web/.env.local` and `apps/android/local.properties` (both gitignored, per-machine).

## Repo layout
```
/home/Koragan/projects/sousbot
├── HANDOFF.md          ← this file
├── _design/            ← source design doc + PRD (read-only reference)
│   ├── PRD.md
│   ├── Forkful Glass.html      ← THE design source
│   └── screens/                ← extracted per-screen screenshots (visual reference)
├── DESIGN.md           ← extracted tokens + screen inventory
├── apps/web/           ← Next.js
├── apps/android/       ← Kotlin/Compose
├── supabase/           ← migrations + edge functions
└── brand/              ← logo, app icon, favicon (#D68D50)
```

## Status board
Update this table on every meaningful change. `WIP commit` after each row flips.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0 | Read PRD + design doc | ✅ done | |
| 1 | Env recon | ✅ done | uss-enterprise, node 22, no Android SDK, playwright installed but no browsers |
| 2 | Android SDK install | ✅ done | SDK at `~/Android/Sdk` (platform-35, build-tools 35.0.0, platform-tools, emulator, x86_64 sysimg, AVD `sousbot`). System java is 25 which AGP rejects → user-local **JDK 21 at `~/.jdks/temurin-21`**. `source /home/Koragan/projects/sousbot/android-env.sh` sets JAVA_HOME+ANDROID_HOME+PATH — **every android build/test agent must source it first.** SELinux `selinuxuser_execheap` already on. |
| 3 | Design extraction (tokens, screen inventory, screenshots) | ✅ done | `DESIGN.md` (361 lines), `_design/tokens.json`, **18 screenshots** in `_design/screens/` (+ `_raw-glass/`, `_raw-interfaces/`). Glass theme only covers 7/18 screens — rest extrapolate. **2 design decisions made:** (a) white-on-`#D68D50` is 2.7:1 → **text on accent is `#2A1B10`**; (b) `#D68D50` collides in hue with the source's "paprika" Pro/missing accent → paprika moved to **`#D9673D`** (iOS) / `#C1502A` (v1+Android). No motion specified in source (static doc). |
| 4 | Supabase project provision + schema | ✅ done | ref `bzguhwqrynjvogrubiny`, eu-central-1. `supabase/migrations/0001_init.sql` + `0002_storage.sql`, `supabase/README.md`, `.env.local`. All 9 tables + RLS verified, `increment_generation_usage` RPC verified atomic (1→2), buckets `fridge-photos`(private)/`dish-images`(public) created. Email auth on; Google/Apple left unconfigured per plan. |
| 5 | Brand assets (logo/icon/favicon) | ✅ done (USER pot glyph) | v1=egg,v2=mushroom/phallic,v3=fork ALL rejected. **FINAL = user-provided steaming-pot glyph**, used verbatim (source stashed `brand/_source-pot-icon-set.svg`). All assets regenerated `8dea919`; coordinator Read+approved icons + both lockups (fixed lockup viewBox 520→600 so "Sousbot" wasn't clipped). Palette: tile `#D68D50`, glyph white, dark tile `#2B2018`, on-light `#D68D50`. **TODO at integration: re-copy `brand/android/mipmap-*` → `apps/android/.../res/mipmap-*` and `brand/web/*` → web public dir (apps still carry old icons).** |
| 5b | fal.ai model recon (text/vision/image) | ✅ done | `AI.md`. **Verified live:** recipes/plans/adapt = `openrouter/router` w/ `google/gemini-2.5-flash` (~2.8s, $0.0009); vision = `openrouter/router/vision` same model (~3.7s) — **strips markdown fences, it wraps output in ```json despite instructions**; dish images = `fal-ai/flux-pro/v1.1-ultra` async queue (~5s, $0.06), cheaper runner-up `fal-ai/nano-banana` ($0.039). No JSON-mode param exists → prompt discipline + parse/retry. Rate limit: 10 concurrent account-wide. |
| 6 | Edge Functions (fal.ai) | ✅ done | **All 7 deployed & verified live** on `bzguhwqrynjvogrubiny`: detect-ingredients, generate-recipes (metered, 402 at 11th), generate-dish-image + dish-image-status (Pro async, real image → `dish-images` bucket), generate-meal-plan, adapt-recipe, webhooks (stripe+revenuecat). **42/42 tests pass** incl. 25-way concurrency race → exactly 10 (real Postgres atomic RPC). Migration `0003` added for async image job cols. API contract: `supabase/functions/README.md`. **TODO:** webhook sig verification fails-open until Stripe/RevenueCat secrets exist (one-line enable, marked in `webhooks/index.ts`). Note: box has no working Docker → deployed via `--use-api` server bundling. |
| 7 | Web app v1.0 | ✅ done + self-verified | Next.js App Router + TS at `apps/web`. All tabs (Home/Planner/Library/List/Profile) + screens (welcome, ingredient-review, results, recipe-detail w/ adapt-sheet + async dish-image polling, cooking-mode w/ WakeLock, paywall) built. **16 screenshots in `apps/web/_shots/` — coordinator Read home, matches glass ref 1:1.** `npm run build` clean. Real e2e vs LIVE edge fns worked (mock signin→ingredients→3 recipes+macros→dish image). fal key absent from bundle (verified). **2 real bugs fixed:** (a) glass blur silently dropped by Lightning CSS collapsing backdrop-filter/-webkit order; (b) `Database` type made `.update()`/`.insert()` resolve to `never`. **Side-effects to know:** enabled **Anonymous sign-ins** on live Supabase (mock-auth needs it); build uses `next build --webpack` (Turbopack fails on brand symlinks); dev server must run on **port 5173** (edge-fn CORS + 3000 occupied). **Known stubs:** billing buttons = toast (no Stripe/RC yet), cook timer decorative, shopping-list no category field. NOTE: `apps/web/AGENTS.md` warns this is a modified Next.js — read `node_modules/next/dist/docs/` before editing. |
| 8 | Android app v1.0 | ✅ done + self-verified | Kotlin/Compose at `apps/android`. All screens built + nested recipe-flow nav-graph (shared `RecipeFlowViewModel`) + `RootScreen` HorizontalPager synced to 4-item bottom nav. `./gradlew clean assembleDebug` **BUILD SUCCESSFUL** (`990d477`); AVD booted, APK installed, screens screencapped + read + matched to `_design/screens/12-16`. Real e2e vs LIVE edge fns worked. Swipe-tabs + sheet grab-handle dismiss verified via `adb input swipe`. **5 real bugs fixed (`954bb29`):** GlassPanel blurred its own content; missing status/nav-bar insets made top buttons untappable; **paywall crashed on open** (negative padding — every 402/Go-Pro would crash); shopping-list inserts silently failed RLS (user_id unset + `encodeDefaults` sent null overriding column defaults); meal-plan Ktor timeout bumped to 60s. **Logged server-side issues (supabase untouched):** `generate-meal-plan` doesn't fail-fast with 402 for free tier + intermittently returns invalid JSON on 7-day plans — Android surfaces the error correctly. Icons still old mark → refresh at integration. |
| 9 | Deploy web → sousbot.ai | ✅ LIVE (Railway subdomain) / ⏳ custom domain | **Live: https://sousbot-web-production.up.railway.app** (HTTP 200, glass UI, brand correct). Deployed via **Railway MCP** (not the invalid `.env.deploy` token — MCP auth is the correct `amirkoragan` account). Railway project `sousbot` (id `e18e1f11-06aa-40a0-9245-2a5d1a9cb988`), service `sousbot-web` (id `757cab78-59e5-4ac4-9f95-f3ac8cf824de`), env production (`119612a2-40a3-4801-b605-72eb209c38e4`). **Source = SEPARATE GitHub repo `Koragan/sousbot-web` (private)** — a clean web-only mirror (apps/web + vendored tokens), NOT the monorepo (monorepo has live creds in HANDOFF/AI.md/supabase-README, must never be pushed). Railway root dir `apps/web`, auto-deploys on push to that repo's `main`. 3 `NEXT_PUBLIC_*` env vars set (all public). CORS: `CORS_EXTRA_ORIGINS=https://sousbot-web-production.up.railway.app` set on Supabase (preflight verified 204). **Custom domain sousbot.ai still needs (a) user to register it, then (b) `railway domain add` + CNAME.** |
| 10 | Refine loop (screenshot→critic→fixer) | ✅ WEB converged / ✅ Android R2 converged | **WEB DONE (1 fix round).** R1 critic: 3 blockers/8 major/9 minor. Fixer round2 (`_refine/web/round2/`, `696384a`): real fixes = N-badge (was Next.js dev route-indicator → `devIndicators:false`), **have/missing matching** (now reads persisted `generation_params.ingredients` — verified "you have 4·missing 0"), home-desktop unified input card, adapt-sheet safe-area padding, greeting fallback, planner date range, ambient bloom, results filter overflow. Many round-1 "majors" were full-page-capture artifacts, confirmed non-bugs by live testing. Coordinator verified round2 screens — clean/brand-correct/glass intact. Residual non-defect: planner-desktop grid needs Pro to populate.<br>**ANDROID: round-1 CAPTURE done, critic+fixer NOT yet run.** 14 clean distinct shots in `_refine/android/round1/` (01-welcome…14-paywall, 1080×2400). Coordinator Read `02-home` = on-brand (glass hero, terracotta CTA, 4-tab full-width nav, usage pill). **NEXT SESSION resumes here:** dispatch Android CRITIC (read `_refine/android/round1/*` vs `_design/screens/12-16` + iOS glass `01-06` + DESIGN.md Android rows + #D68D50/dark-text rules → `_refine/android/round1/CRITIQUE.md`), then FIXER, then re-verify into `round2/`. **Android-specific findings from capture (`_capture-notes.txt`):** (a) recipe-detail has NO separate steps section — steps live only in Cooking Mode (by design, not a bug); (b) meal-planner "Generate week" is Pro-gated → free anon user hits paywall (can't capture populated planner without a Pro account); (c) **welcome hero shows literal placeholder text `"looping demo · fridge photo → plated dish"` — no animation asset wired; likely a real fix item.** |

## ▶ RESUME HERE (next session — do this in order)

**▶▶ SESSION 8 — DEPLOY SOURCE REPO CHANGED (2026-07-23).** Per user, the collab repo is now **`EfeSimsek-Conqueror/sous-bot`** (owned by collaborator Efe). Pushed the **FULL monorepo, scrubbed** (no creds, no old history — single fresh commit): HANDOFF.md excluded, AI.md + supabase/README.md secret literals replaced with placeholders, added `README.md` + `.env.example`. Deploy path is NO LONGER `Koragan/sousbot-web` — Railway service `sousbot-web` now sources **`EfeSimsek-Conqueror/sous-bot` @ main, root `apps/web`** (env vars preserved, live site unaffected). **BLOCKED:** Railway GitHub app lacks access to Efe's repo → Efe must Configure the Railway GitHub app to allow `sous-bot` before auto-deploy works. **New re-sync flow to ship a web change:** make it in monorepo `apps/web`, then push a SCRUBBED snapshot to `EfeSimsek-Conqueror/sous-bot` main (git archive HEAD → strip HANDOFF.md + secret literals in AI.md/supabase-README, copy `_design/tokens.json`→`apps/web/tokens.source.json`) → Railway auto-builds. Clean snapshot staged at `scratchpad/sous-bot-clean` this session.

**▶▶ SESSION 8 (landing) STARTS HERE (2026-07-23).** **DIRECTION CHANGE ON THE LANDING PAGE:** the user is now **designing the landing page in a separate/external tool** and will bring back their own design. So treat the current in-repo landing (`apps/web/components/LandingPage.tsx`, the 11-element build) as **likely to be REPLACED** — don't invest more polish in it unprompted; wait for their design, then port it into `apps/web` against the existing brand system (#D68D50/glass/Instrument Serif+Schibsted Grotesk, no green, dark-warm) and redeploy via the mirror. I handed the user a **product + copy + brand brief** (one-liner, tagline "What's for dinner, solved.", the 3-step loop, feature list, Free/Pro pricing $0 / $7.99·mo or $59.99·yr, truthful stat props, and the full color/type/logo spec) to feed that external tool — reuse/extend that brief if they ask for more copy. **Still true:** current landing is LIVE at https://sousbot-web-production.up.railway.app; testimonials there are placeholders; don't fabricate reviews/metrics. When their new design lands, watch the same gotchas from session 6 (Tailwind stale cache → `rm -rf .next`; no stacked CSS-animation classes; `overflow-x-clip` not `-hidden`). Deploy path unchanged: monorepo `apps/web` → sync mirror `git archive HEAD apps/web` + copy `_design/tokens.json`→`apps/web/tokens.source.json` → push `Koragan/sousbot-web` main → Railway auto-builds. **Open user items unchanged:** register `sousbot.ai` (then `railway domain add` + reconcile `cors.ts` `.app`→`.ai`).

**▶▶ SESSION 7 (done):** The **landing page was REBUILT** with the `landing-page-guide-v2` skill (11-element framework), adapted to the brand — LIVE at https://sousbot-web-production.up.railway.app. `apps/web/components/LandingPage.tsx` now has all 11 elements: sticky header, hero(title+CTA), social-proof strip, media showcase (in-app phone mockups built from tokens — NO stale screenshots), features, how-it-works, testimonials, pricing, FAQ accordion (native `<details>`), final CTA, multi-column footer. Added `components/Reveal.tsx` (IntersectionObserver scroll-reveal + 1.8s safety fallback) and staggered hero entrance (`.lp-enter`/`.lp-reveal` keyframes in globals.css), plus SEO/OG metadata in `layout.tsx`. **⚠ TESTIMONIALS are ILLUSTRATIVE placeholders** (Maya/Deniz/Priya, no fabricated metrics) — REPLACE with real reviews before any public/paid launch. **Gotchas hit & fixed (watch for recurrence):** (a) Tailwind v4 stale cache silently drops new arbitrary classes → `rm -rf .next` before build when classes "don't apply"; (b) two `animation:` classes on one element collide (lp-enter+lp-float hid the hero card) — never stack CSS-animation utilities; (c) `overflow-x-hidden` forces `overflow-y:auto`, making a `min-h-dvh` root clip the whole page to one viewport → use **`overflow-x-clip`**. Verified via a **CDP screenshot harness** (`scratchpad/cdpshot.mjs`, Node-22 WebSocket→system chrome) because headless `--virtual-time-budget` doesn't run entrance animations/IO reliably. The old bare `WelcomeScreen.tsx` still exists unused (real-auth reference). Deploy pipeline: push to `Koragan/sousbot-web` main → Railway auto-builds (~2-3 min). (11-element framework), adapted to the brand — LIVE at https://sousbot-web-production.up.railway.app. `apps/web/components/LandingPage.tsx` now has all 11 elements: sticky header, hero(title+CTA), social-proof strip, media showcase (in-app phone mockups built from tokens — NO stale screenshots), features, how-it-works, testimonials, pricing, FAQ accordion (native `<details>`), final CTA, multi-column footer. Added `components/Reveal.tsx` (IntersectionObserver scroll-reveal + 1.8s safety fallback) and staggered hero entrance (`.lp-enter`/`.lp-reveal` keyframes in globals.css), plus SEO/OG metadata in `layout.tsx`. **⚠ TESTIMONIALS are ILLUSTRATIVE placeholders** (Maya/Deniz/Priya, no fabricated metrics) — REPLACE with real reviews before any public/paid launch. **Gotchas hit & fixed (watch for recurrence):** (a) Tailwind v4 stale cache silently drops new arbitrary classes → `rm -rf .next` before build when classes "don't apply"; (b) two `animation:` classes on one element collide (lp-enter+lp-float hid the hero card) — never stack CSS-animation utilities; (c) `overflow-x-hidden` forces `overflow-y:auto`, making a `min-h-dvh` root clip the whole page to one viewport → use **`overflow-x-clip`**. Verified via a **CDP screenshot harness** (`scratchpad/cdpshot.mjs`, Node-22 WebSocket→system chrome) because headless `--virtual-time-budget` doesn't run entrance animations/IO reliably. The old bare `WelcomeScreen.tsx` still exists unused (real-auth reference). **User's standing ask: "keep up with refinements"** — landing motion is intentionally restrained; iterate on their feedback. Deploy pipeline: push to `Koragan/sousbot-web` main → Railway auto-builds (~2-3 min).

**▶▶ SESSION 5 (done):** WEB deployed via Railway MCP (see deploy row #9 for all IDs). **Key facts for future web changes:** the deployed source is a SEPARATE private repo `Koragan/sousbot-web` (clean web-only mirror), NOT the monorepo. To ship a web change: make it in the monorepo `apps/web`, then re-sync the mirror — `git archive HEAD apps/web | tar -x -C <deploydir>/`, copy `_design/tokens.json`→`apps/web/tokens.source.json`, commit + push to `sousbot-web` main → Railway auto-deploys. (A build helper wasn't scripted; the steps are in the session-4 log below.) **DO NOT push the monorepo to GitHub** — it contains live Supabase/fal/Railway creds in HANDOFF.md, AI.md, supabase/README.md. The `.env.deploy` Railway token is still invalid/irrelevant — deploys go through the MCP now. **ONLY remaining deploy work = custom domain:** user must register `sousbot.ai`, then `railway domain add` + give them the CNAME. Also note the CORS allowlist in `supabase/functions/_shared/cors.ts` hardcodes `sousbot.app` (`.app`, not `.ai`) — reconcile to the real domain when it's registered.

**▶▶ SESSION 4 (done):** Android refine loop is DONE — coordinator ran critic (read all 14 round-1 shots vs design refs) + fixer + on-device re-verify itself (no subagents this round). Round-2 shots in `_refine/android/round2/` (00-welcome, 09-meal-planner, 14-paywall — the 3 changed screens). **3 real fixes shipped:** (a) `BgGradientTop` warmed `#1A231D`→`#231E1A` (the source green base was casting green on the bare tab screens — violated "no green survives"; tokens.json synced too); (b) welcome hero's literal placeholder text `"looping demo · fridge photo → plated dish"` replaced with a designed fridge→arrow→plate illustration + caption; (c) paywall banner reworded to `Free plan · N of 10 generations used this month` (was `N of 10 free recipes used` — misleading when opened from the planner). Many round-1 "critic" candidates were confirmed non-bugs (recipe-detail already has `contentPadding=120dp` so the CTA doesn't truly occlude the list; it was just the un-scrolled state). **Only remaining work is BLOCKED ON USER:** (1) valid Railway token (deploy fully prepped) + (2) register `sousbot.ai`. **Consistency follow-up for whoever redeploys web:** the same green base `#1A231D` may exist in the web CSS — check `apps/web` and warm it to `#231E1A` on the next web redeploy so both platforms match tokens.json.

**▶▶ SESSION 3 (done) (paused 2026-07-23 ~16:xx at user request to continue fresh).** Do FIRST: (1) commit author email is now **amirkoragan@gmail.com** — always `git -c user.email=amirkoragan@gmail.com -c user.name=Koragan commit`. (2) There may be **stray processes** left from session 2 (a `qemu-system` emulator PID ~4172674, a `next dev` under `apps/web`, leftover `--headless=new` chrome, an `adb` server) that this session's shell couldn't kill (background-agent process group, sandbox-isolated) — they should die with the old session, but if the emulator/dev-server is still up, `pkill -9 -f qemu-system; adb kill-server; pkill -9 -f 'next dev'` before booting fresh. (3) Two things await the USER: a **valid Railway token** (deploy is fully prepped, blocked only on auth — see deploy row) and **registering sousbot.ai**. (4) Resume the **Android refine loop** (status row #10) — round-1 shots are captured; run critic→fixer→re-verify. Then a final refined **web redeploy** once a token exists.

---
**SESSION 2 STATE (as of ~10:30, 2026-07-23):** Backend ✅, Brand ✅ (user's pot glyph), Web ✅, Android ✅, **Icons integrated into both apps ✅** (`25dbfa8` — android mipmaps replaced + adaptive fg/bg rasterized; web icons are symlinks into `brand/` so already current; both apps rebuild clean; emulator confirms pot icon on launcher).
Remaining: (B) **Deploy web** — user chose **Railway now, attach sousbot.ai later**. BUT **sousbot.ai is NOT registered** (whois "Domain not found") AND **no Railway MCP/CLI/token exists in this env** (brief mentioned Railway MCP but it's absent; no stored creds). Railway MCP reconnect failed for user, so user gave a token directly (`.env.deploy`, gitignored). **That Railway token (now dead) is INVALID** — rejected by Railway's own backend API (verified via raw GraphQL, not a CLI quirk). **DEPLOY BLOCKED: need a regenerated valid Railway token** (dashboard → Account Settings → Tokens). **BUT all deploy prep is DONE & committed (`97db3b2`):** icon symlinks dereferenced to real files (4 of them, incl `apps/web/public/brand`), `start`=`next start -p $PORT`, `engines.node=22.x`, local `next build --webpack` clean, env audit = only `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY/FUNCTIONS_URL` needed (no service_role/FAL in web — correct). **Once a valid token lands, deploy is one `railway up`** — steps in the deploy agent's report. **CORS note:** `supabase/functions/_shared/cors.ts` allowlist hardcodes localhost + `sousbot.app`/`www.sousbot.app` (NB: `.app` not `.ai` — minor inconsistency to reconcile with the real domain) and reads extra origins from `CORS_EXTRA_ORIGINS` env. After deploy: `supabase secrets set CORS_EXTRA_ORIGINS=https://<app>.up.railway.app`. Attach `sousbot.ai` via `railway domain add` once registered (CNAME target shown per-service at that time). When token arrives: `npm i -g @railway/cli`, `railway login --token`, deploy `apps/web` (Next.js, `next build --webpack`, port-agnostic in prod; set env from `apps/web/.env.local` MINUS server-only secrets exposure — anon key + SUPABASE_URL are public/NEXT_PUBLIC, service_role must NOT ship to a static/client build but this app has server components so keep service_role server-side only). Add sousbot.ai as custom domain once user registers it; give them the CNAME/A records. (C) **Phase B refine loop** (task #10) — can run now, independent of deploy.
_(historical) Session 1 ended at 95% of the 5h limit. Backend done & verified; clients partial; brand redo._
Nothing below is blocked on the user — just execute. All 3 running agents were stopped cleanly; their partial
work is committed (commit `f3eb3c1`). Dispatch model rule (from user): **sonnet-5 for code, haiku for everything else.**

1. **Brand mark v3 (blocker for final icons, but NOT for client dev — dev can proceed in parallel).**
   Re-dispatch a brand agent (sonnet) with this exact brief: the single-organic-blob approach is dead
   (v1=egg, v2=mushroom+**phallic**, both rejected). Produce TWO geometric/literal candidates —
   **(A) a fork (lead recommendation)**, **(B) a properly pleated chef toque** (crown WIDER than the band,
   pleats as internal fills not an outline, short cylindrical band). Judge each at true 16/32/400px, Read the
   PNGs, state the unflattering read, and **explicitly confirm neither reads as anything anatomical / egg /
   blob / mushroom / crown**. Expect the fork to win on safety. Then regenerate EVERY asset from the winner
   (logo-mark, logo-full + dark, favicon set + .ico, icon.svg, all 5 mipmap densities incl. round, PWA 192/512,
   apple-touch, og-image) and rebuild `brand/preview.png`. **The coordinator must Read preview.png and approve
   before it's considered done** — do not trust the agent's self-assessment (it passed the egg and phallus).
   After approval, re-copy `brand/android/mipmap-*` into `apps/android/.../res/mipmap-*` and `brand/web/*`
   into the web app's public dir.

2. **Finish the WEB app (sonnet).** Resume agent or fresh. Build the 3 missing tabs (Library/List/Profile) and
   the 6 missing screens (Camera, Ingredient-review, Results, Recipe-detail, Cooking-mode, Paywall). Then the
   MANDATORY self-verify it never reached: `cd apps/web && npm run build` must pass clean; run dev server,
   headless-Chrome screenshot every screen into `apps/web/_shots/`, Read them, diff against `_design/screens/`,
   fix mismatches. Confirm the mock-auth→type-ingredients→generate flow works against the LIVE edge functions.
   Grep the bundle for the fal key (must be absent — PRD criterion).

3. **Finish the ANDROID app (sonnet).** `source /home/Koragan/projects/sousbot/android-env.sh` FIRST in every
   shell (JDK21 + SDK). Build the 9 missing screens + VMs + the HorizontalPager tab wiring. Then the MANDATORY
   self-verify: `./gradlew assembleDebug` must pass; boot AVD headless
   (`emulator -avd sousbot -no-window -no-audio -gpu swiftshader_indirect &`), install, screencap every screen
   into `apps/android/_shots/`, Read + diff against `_design/screens/12-16`, verify swipe-between-tabs and
   sheet grab-handle dismissal with `adb shell input swipe`.

4. **Deploy web → sousbot.ai** (task #9). `gh` is authed; Railway MCP available. Domain `sousbot.ai` — check
   if the user owns it / DNS. Ask the user only if domain ownership is unknown.

5. **Refine loop** (task #10, the user's Phase B). Only after both clients build & run. 3 agents in sequence per
   round: (1) screenshot every page/subpage/element → (2) critic flags visual errors/bugs/ugly/off-spec vs
   `_design/screens/` and the #D68D50 rule → (3) fixer. Repeat rounds until the critic returns zero issues.
   The coordinator Reads the screenshots each round too — don't rely solely on the critic agent.

**Watch-outs learned this session:**
- Verify agent visual claims yourself by Reading the image — the brand agent self-approved an egg and a phallus.
- White text on `#D68D50` fails contrast → text on accent is `#2A1B10` (already in tokens.json).
- `#D68D50` collides with the design's "paprika" Pro/missing accent → paprika shifted to `#D9673D` (in tokens).
- This box has NO working Docker → Supabase functions deploy with `supabase functions deploy --use-api`.
- System Java is 25 (AGP rejects it) → always `source android-env.sh` for JDK21.
- fal vision wraps JSON in markdown fences despite instructions → edge fn already strips them.

## Log
- **2026-07-23** — Session start. PRD + design doc read. User chose native Kotlin/Compose Android and
  fal.ai as the sole AI provider. Project scaffolded at `/home/Koragan/projects/sousbot`.
- **2026-07-23** — Wave 1 done: Android toolchain (SDK+user-local JDK21), Supabase provisioned + schema/RLS/
  storage, fal.ai models verified live, design system extracted (18 screens). Brand v1 (egg) + v2
  (mushroom/phallic) both rejected. **Backend complete: 7 Edge Functions deployed + verified e2e, 42/42 tests
  pass.** Web (~40%) + Android (~30%) clients scaffolded but incomplete.
- **2026-07-23 — SESSION 1 END (5h limit ~95%).** User asked to stop & wrap for next session. All 3 running
  agents (web, android, brand-v3) stopped; partial work committed (`f3eb3c1`). Resume from the ▶ block above.
- **2026-07-23 — SESSION 7.** User decided to **design the landing page in an external tool** and bring their
  own design back; gave them a product/copy/brand brief to feed it. Current in-repo 11-element landing stays live
  but is expected to be replaced — hold further polish until their design arrives, then port it into `apps/web`.
- **2026-07-23 — SESSION 6.** Rebuilt the landing page with the `landing-page-guide-v2` skill (11-element
  framework), adapted to the existing brand (no ShadCN). Added scroll-reveal + staggered hero motion, SEO/OG
  metadata, in-app phone mockups. Fixed 3 gotchas (Tailwind stale cache, animation-class collision,
  overflow-x-hidden clipping). Verified every section via a Node-22 CDP screenshot harness; deployed + live.
  Testimonials are placeholders to replace before public launch.
- **2026-07-23 — SESSION 5.** Added a **marketing landing page** (`LandingPage.tsx`) as the logged-out root
  (hero + product macro card, feature grid, how-it-works, Free/Pro pricing, CTA band, footer). Replaced the bare
  `WelcomeScreen` in `AppShell`. Built clean, screenshot-verified desktop+mobile locally, deployed via the mirror
  → Railway auto-deploy → verified live. User also said "keep up with refinements" — landing is v1 for hands-on tuning.
- **2026-07-23 — SESSION 4.** **Web deployed live via Railway MCP** → https://sousbot-web-production.up.railway.app.
  User said "use mcp"; the Railway MCP was authed as the correct `amirkoragan` account (the `.env.deploy` token was
  moot). MCP deploys from GitHub only, so: created a clean private repo `Koragan/sousbot-web` (web-only, no creds),
  pushed it, and used `railway-agent` to create the service (root dir `apps/web`, 3 NEXT_PUBLIC env vars, npm build/start).
  First build FAILED — prebuild's token generator read `../../../_design/tokens.json`, outside the `apps/web` build
  context. Fixed by making `generate-tokens.mjs` fall back to a vendored `apps/web/tokens.source.json` (committed to
  monorepo), and shipping that copy in the mirror. Redeploy SUCCESS, HTTP 200, CORS secret set + preflight verified 204.
  Side-effect: regenerating tokens picked up the session-3 warm-bg change, so `apps/web/app/tokens.generated.css` now
  matches (web green→warm consistency fix landed). **Deploy-repo re-sync steps:** `git archive HEAD apps/web | tar -x
  -C <dir>`; `cp _design/tokens.json <dir>/apps/web/tokens.source.json`; commit+push to sousbot-web main.
- **2026-07-23 — SESSION 3.** Android refine loop converged (round 2). Coordinator did critic+fixer+on-device
  re-verify itself (no subagents). 3 fixes: warmed the green base gradient (`#1A231D`→`#231E1A`, tokens synced),
  replaced the welcome-hero placeholder text with a real fridge→dish illustration, reworded the paywall banner.
  Verified on emulator. Deploy still blocked on user (valid Railway token + register sousbot.ai).
- **2026-07-23 05:31 — SESSION 2 START.** Sleep-until-reset loop fired hourly through the night and ended at
  05:31 when the 5h limit reset. Auto-resumed with zero user input. Re-dispatched 3 agents (sonnet): brand
  mark v3 (fork/toque), finish web (3 tabs + 6 screens + self-verify), finish android (9 screens + pager +
  emulator self-verify). Backend untouched (already complete). Awaiting completions.
