# Sousbot — Android

Native Kotlin + Jetpack Compose client. Thin client only — every AI call (ingredient detection,
recipe generation, meal planning, recipe adaptation, dish-photo generation) goes through the
Supabase Edge Functions documented in `supabase/functions/README.md`. **No AI provider key of
any kind ships in this app** (PRD acceptance criterion 11) — verify with:

```bash
unzip -p app/build/outputs/apk/debug/app-debug.apk classes.dex classes2.dex 2>/dev/null | strings | grep -i "fal.ai\|FAL_KEY" || echo "clean"
```

## Toolchain

System Java is version 25, which AGP rejects. A user-local JDK 21 is required.

```bash
source /home/Koragan/projects/sousbot/android-env.sh   # sets JAVA_HOME + ANDROID_HOME + PATH
cd apps/android
./gradlew assembleDebug
```

SDK lives at `~/Android/Sdk` (platform-35, build-tools 35.0.0, emulator, x86_64 system image).
An AVD named `sousbot` already exists. `local.properties` (gitignored) holds the Supabase URL +
anon key, injected into `BuildConfig` at build time — never hardcoded in source.

### Running on the emulator

```bash
source android-env.sh
emulator -avd sousbot -no-window -no-audio -gpu swiftshader_indirect &
adb wait-for-device
# poll: adb shell getprop sys.boot_completed   (until it prints 1)
./gradlew installDebug
adb shell am start -n com.sousbot.app/.MainActivity
adb exec-out screencap -p > _shots/whatever.png
```

## Architecture

- **Theme** (`theme/`): `Color.kt` (the `#D68D50` accent ramp + glass palette, all derived from
  `_design/tokens.json`), `Type.kt` (Instrument Serif display / Schibsted Grotesk UI, bundled as
  TTFs), `Glass.kt` (the signature glass-panel system), `Theme.kt` (dark-first MaterialTheme),
  `Motion.kt` (respects the system animator-duration-scale / reduced-motion setting).
- **Data layer** (`data/`): `SousbotRepository` is the single façade every ViewModel talks to. It
  wraps `EdgeFunctionsApi` (the 7 Edge Functions), `PostgrestApi` (direct RLS-scoped REST for
  profile/recipes/shopping-list — the caller's own JWT gates every row), `SupabaseAuthClient`
  (mock auth, see below), and `SessionStore` (DataStore-persisted session). Every network method
  returns `ApiResult<T>` (`Success` / `PaymentRequired` / `Error`) so every screen renders
  loading/empty/error/paywall from one uniform shape.
- **Nav** (`nav/Routes.kt`, `MainActivity.kt`): a single `NavHost`. `Welcome → Root` is the outer
  shell; `Root` hosts the `HorizontalPager` (Home/Planner/Library/List) + the Android-specific
  bottom nav bar. Camera → Ingredient review → Results → Recipe detail → Cooking mode is a
  **nested nav graph** (`Routes.FLOW_GRAPH`) so all five screens share one
  `RecipeFlowViewModel` instance scoped to the graph's own back-stack entry — ingredients/recipes/
  selection survive back-and-forth navigation within the flow without a re-fetch, and the whole
  flow's state resets naturally once the user backs all the way out to Root (the graph's
  back-stack entry, and its ViewModel, gets destroyed).
- **Screens** (`ui/*`): `welcome`, `home`, `camera`, `recipeflow` (ingredient review, results,
  recipe detail, cooking mode), `mealplanner`, `shoppinglist`, `library`, `profile`, `paywall`,
  `root` (the pager shell). Components shared across screens live in `ui/components/`.

## Mock auth

Both "Continue with Google" and "Continue with Apple" call the same `signInAnonymously()`,
which performs a **real** Supabase anonymous sign-in (`POST /auth/v1/signup` with an empty
body — the documented GoTrue mechanism) — a real `user_id`, real rows in Postgres, just no real
OAuth handshake yet. `TODO(real-oauth)` is marked in `SupabaseAuthClient.kt`.

## The glass look — blur fallback decision

Compose has no CSS `backdrop-filter`. `theme/Glass.kt`'s `GlassPanel`:

- **API 31+ (Android 12+)**: real blur via `Modifier.blur()`, backed by
  `RenderEffect.createBlurEffect` on those API levels, applied to the panel's own translucent
  fill/border. Every Sousbot background is our own static gradient + radial "bloom" (never a
  live/scrolling camera feed), so self-blur-plus-translucency reads visually the same as a true
  backdrop-filter would here — Compose has no public "sample the layer beneath me" API without an
  expensive manual bitmap capture, so this is the pragmatic equivalent rather than a compromise.
- **API 26–30**: `Modifier.blur()` silently no-ops per the Compose docs, so `GlassPanel` swaps in
  a higher-opacity solid translucent surface (`GlassElevation.fallbackColor`) instead — a graceful
  legibility-first degrade, never a crash or a see-through-nothing panel. `minSdk = 26`, so this
  path is real and exercised on the low end of the supported range.

## Screens built this pass

Ingredient review (editable chips, detect-ingredients wired, add-item bottom sheet), Results
(free-tier list, no dish photos), Recipe detail (macros row, have/missing ingredient list, save +
start-cooking sticky bar, real async dish photo via Coil when Pro/ready), Cooking mode (large
serif step text, 8-segment progress bar, screen-keep-awake via `View.keepScreenOn`, an optional
per-step countdown timer parsed from step text), Meal planner (Pro-gated `generate-meal-plan`,
day-plan rows, missing-ingredients summary band), Shopping list (checkable, add-item bottom
sheet, FAB), Library (saved/generated recipes grid), Profile (diet/allergy pills, language/units,
plan status + Go Pro, sign out — reached via Home's app-bar avatar, **not** a bottom-nav tab per
the Android-specific nav spec), Paywall (feature checklist + monthly/annual plan cards).

**Swipe + tab-bar sync**: `RootScreen` drives one `PagerState` for both the `HorizontalPager` and
the bottom nav bar's selection — reading `pagerState.currentPage` renders the active tab, tapping
a tab calls `animateScrollToPage` (or an instant `scrollToPage` when reduced-motion is on).

**Bottom sheets**: `ui/components/Sheet.kt` wraps `ModalBottomSheet` with its default
`BottomSheetDefaults.DragHandle` — dismiss by dragging the top handle down (or tapping the scrim).
Used for "add ingredient" and "add shopping item"/"add allergy".

## Known gaps / explicitly out of scope for this build

- **Billing**: the Paywall's "Subscribe with Google Play" button is presentational only — no
  Play Billing / RevenueCat SDK is wired on the Android client (the server side already has
  `webhooks/stripe` + `webhooks/revenuecat` ready to receive events once a billing SDK exists).
- **Real OAuth**: see "Mock auth" above.
- **detect-ingredients confidence**: the deployed endpoint returns a plain `string[]`, no
  per-item confidence score, so the low-confidence chip visual variant (`cream · 62%?`) has no
  real data to bind to on Android and is not shown — every chip renders in its normal state.
- **Shopping-list sections**: `shopping_list_items` has no category column server-side, so the
  list renders as one flat checkable list rather than inventing PRODUCE/DAIRY/PANTRY groupings
  not backed by real data.
