# PRD — AI Kitchen App (working title)

## Problem

Every day, people stand in front of a fridge full of random ingredients and don't know what to cook. Searching recipes online means finding dishes that require ingredients they don't have, don't match their diet, or don't fit their taste. Meal planning takes willpower, shopping lists are made from memory, and food gets wasted. Existing recipe apps are static databases — they don't know what's in *your* kitchen or what *you* like.

## Solution

A cross-platform app (web, iOS, Android) where AI turns whatever the user has into what they should cook. The user snaps a photo of their fridge or types their ingredients; the app detects the ingredients, generates personalized recipes with macros and a generated photo of the finished dish, builds weekly meal plans, and produces a shopping list containing only what's missing. A taste profile learns from likes/dislikes so results improve over time.

Positioning: the product serves busy people, budget cooks, diet-focused users, and hobby cooks — but marketing leads with the busy-person "what's for dinner?" pain (largest market, clearest hook). The hero interaction is the camera button: fridge photo → recipes.

Monetization: subscription only. Free tier = 10 AI recipe generations/month, no dish images. Pro = unlimited generations, dish images, meal planner, recipe adaptation.

## User Stories

1. As a new user, I want to sign up with Google or Apple in one tap, so that I can start without creating another password.
2. As a busy user, I want to take a photo of my fridge and have the app list the ingredients it sees, so that I don't have to type anything.
3. As a user reviewing detected ingredients, I want to edit, remove, or add items before generating, so that wrong detections don't ruin my recipes.
4. As a user without a photo handy, I want to type or pick my available ingredients, so that I can still get recipes.
5. As a user, I want the app to generate several recipe options from my ingredients, so that I can pick what sounds good tonight.
6. As a diet-conscious user, I want every generated recipe to include calories and macros (protein/carbs/fat), so that I can make informed choices without a separate tracking app.
7. As a Pro user, I want to see an AI-generated photo of the finished dish, so that I know what I'm cooking toward and feel confident picking a recipe.
8. As a user with allergies or a diet (vegan, gluten-free, halal, keto, etc.), I want to set these once in my profile, so that every generation automatically respects them.
9. As a returning user, I want to thumbs-up/down recipes, so that future suggestions match my taste better.
10. As a planner, I want a weekly meal plan generated from my preferences and pantry, so that I decide "what's for dinner" once a week instead of daily.
11. As a shopper, I want the meal plan to produce a shopping list of only the ingredients I'm missing, so that I buy exactly what I need and waste less.
12. As a shopper in the store, I want to check items off the shopping list on my phone, so that I can track what's in my cart.
13. As a user, I want to maintain a simple pantry list of staples I always have, so that the app doesn't tell me to buy salt.
14. As a hobby cook, I want to paste a recipe URL or photo and have the AI adapt it (vegan version, half portions, ingredient substitution, air-fryer version), so that any recipe on the internet works for me. (Pro)
15. As a user mid-cooking, I want step-by-step cooking mode with large text, so that I can follow along with messy hands.
16. As a user, I want to save recipes to my library and see my generation history, so that I can cook past favorites again.
17. As a budget-conscious user, I want a "leftover rescue" prompt style that prioritizes using up what I have, so that I throw away less food.
18. As a free user, I want to clearly see how many of my 10 monthly generations remain, so that I'm never surprised by the paywall.
19. As a free user hitting my limit, I want a clear upgrade screen showing what Pro adds, so that I can subscribe in a few taps (Stripe on web, native purchase on iOS/Android via RevenueCat).
20. As a Pro subscriber, I want my subscription recognized on all my devices regardless of where I bought it, so that paying once is enough.
21. As a subscriber, I want to manage/cancel my subscription from the platform I bought it on, so that billing feels trustworthy.
22. As a user, I want my pantry, library, taste profile, and plans synced across web, iOS, and Android, so that any device is fully mine.
23. As a user, I want the app to work in my language and units (metric/imperial), so that recipes are usable where I live.

## Implementation Decisions

**Platforms & clients**
- Three clients launched simultaneously: Web (React/Next.js), iOS (Swift/SwiftUI), Android (Kotlin/Jetpack Compose).
- Clients are intentionally thin: UI + local state only. All business logic, AI calls, and entitlement checks live server-side so the three clients stay consistent and cheap to maintain.

**Backend**
- Supabase: Postgres DB, Auth (Google + Apple sign-in), Storage (user photos, generated images), Edge Functions as the API layer.
- Row Level Security on all user data tables.
- Clients never call AI providers directly. Every AI request goes: client → Edge Function → (entitlement check) → AI provider → structured response → DB → client.

**AI stack**
- Recipe generation, meal planning, macro estimation, recipe adaptation: Gemini 2 series (Flash for speed/cost by default; structured JSON output enforced).
- Ingredient detection from photos: Gemini multimodal (same provider simplifies the stack). fal.ai vision models are the fallback option if detection quality disappoints.
- Dish image generation: fal.ai (Pro-only). Generated asynchronously — recipe text renders immediately with a placeholder; image fills in when ready.
- All prompts include the user's taste profile, allergies, and diet flags. Allergy constraints are treated as hard constraints in the prompt and re-validated by a post-generation check against the allergen list.

**Monetization & entitlements**
- Subscription only. Free: 10 recipe generations/month, no images, no meal planner, no recipe adaptation. Pro: unlimited generations, dish images, meal planner, adaptation.
- iOS/Android purchases via RevenueCat; web purchases via Stripe. Both push webhook events to an Edge Function that writes to a single `subscriptions` table — the one source of truth.
- Usage metering: `usage_counters` table (user_id, period, generation_count), incremented atomically inside the same Edge Function that serves the generation. Counter resets monthly.
- The entitlement check is one shared function used by every gated endpoint.

**Data model (high level)**
- `profiles` (user, language, units, diet flags, allergies)
- `taste_events` (user, recipe, liked/disliked) → aggregated into taste profile
- `pantry_items`, `shopping_list_items` (with checked state, source plan reference)
- `recipes` (structured JSON: title, ingredients with quantities, steps, macros, image_url, generation params)
- `meal_plans` (week, entries referencing recipes)
- `subscriptions`, `usage_counters`

**API contracts (Edge Functions)**
- `POST /detect-ingredients` — image in, ingredient list out
- `POST /generate-recipes` — ingredients + constraints in, N structured recipes out (gated, metered)
- `POST /generate-dish-image` — recipe id in, image url out (Pro-gated)
- `POST /generate-meal-plan` — preferences + pantry in, weekly plan + missing-items shopping list out (Pro-gated)
- `POST /adapt-recipe` — url or photo + transformation in, adapted recipe out (Pro-gated)
- `POST /webhooks/revenuecat`, `POST /webhooks/stripe` — subscription sync

**UX decisions**
- Home screen: camera button is the primary action; "type ingredients" one tap away; meal planner, library, shopping list as tabs.
- Detected ingredients are always shown for confirmation before generation (trust + correction).
- Free users see a persistent "X of 10 left this month" indicator; hitting the limit routes to the upgrade screen.

## Test Decisions

Definition of a good test here: it exercises externally visible behavior through the module's interface (call the function/endpoint, assert on the response and DB state) — never internal implementation details.

Modules to test (chosen because they touch money or core logic; user deferred to recommendation):

1. **Entitlements & usage metering** — free user blocked at 11th generation; counter resets on new period; Pro user unmetered; RevenueCat and Stripe webhook payloads both result in correct `subscriptions` state; concurrent generation requests don't double-spend the counter.
2. **Recipe engine output handling** — malformed/partial LLM JSON is rejected and retried, never stored or returned broken; allergy hard-constraint post-check rejects violating recipes.
3. **Shopping list diff logic** — (meal plan ingredients) minus (pantry items) produces the correct missing list, including unit/quantity merging of duplicate ingredients.

UI and client apps: manual testing only for v1.

## Acceptance Criteria

1. A new user can sign up with Google or Apple on web, iOS, and Android, and lands on the home screen with the camera action visible.
2. Photo → detected ingredients → user confirms → at least 3 structured recipes render with title, ingredients, steps, and macros; end-to-end under 20 seconds on a normal connection.
3. Typing ingredients produces the same recipe flow without a photo.
4. A free user's 11th generation attempt in a month is blocked server-side and shows the upgrade screen; the counter visibly resets the next month.
5. A user who subscribes on iOS (RevenueCat sandbox) is recognized as Pro on web and Android within 1 minute, and vice versa for a Stripe web purchase.
6. Pro users receive a generated dish image for a recipe; free users never do, even if the client requests it (server-enforced).
7. Pro user generates a 7-day meal plan; the shopping list contains only ingredients absent from their pantry; items can be checked off and state syncs across devices.
8. A recipe adapted via URL respects the requested transformation (e.g., vegan) and the user's allergy flags.
9. Thumbs-up/down on 5+ recipes measurably changes subsequent generation prompts (taste profile is included and non-empty).
10. All three clients build and pass their CI pipelines; the three tested modules have passing automated test suites.
11. No client contains AI provider API keys; all AI traffic flows through Edge Functions (verified by code review + network inspection).

## Out of Scope (v1)

- Calorie/diet *tracking* over time (logging meals eaten, weight tracking) — recipes show macros, but no longitudinal tracking dashboard.
- Voice-controlled or AI-chat cooking mode ("can I substitute butter?") — planned as a fast-follow.
- Grocery delivery integrations (Instacart, Getir, etc.).
- Social features: sharing, comments, public profiles, community recipes.
- Credit top-up purchases (subscription only in v1).
- Offline mode beyond viewing already-saved recipes.
- Barcode scanning for pantry input.
- Tablet-optimized layouts.

## Notes

- **Positioning decision:** product serves four audience segments, but all marketing assets (store listing, landing page, first screenshot) lead with the busy-person "what's for dinner?" story. Fridge-photo-to-plated-dish-image is the demo moment.
- **Cost control:** image generation (fal.ai) is the dominant variable cost — hence Pro-only and async. Gemini Flash keeps text generation cost low; monitor per-user monthly AI cost against subscription price before setting final pricing.
- **Pricing:** final subscription price not yet decided — validate against AI cost per active Pro user. Placeholder assumption: single Pro tier, monthly + discounted annual.
- **Risk (accepted by user):** launching three platforms simultaneously triples client work and QA surface. Mitigation: thin clients, all logic server-side, shared design system tokens.
- **Assumption:** Gemini multimodal is used for ingredient detection to keep the stack simple; if detection quality is insufficient, swap to a fal.ai vision model behind the same `/detect-ingredients` contract.
- **Test module selection** was recommended by the assistant and accepted implicitly (user was unfamiliar with automated testing); revisit if priorities change.
- Working title TBD — naming and branding out of scope for this PRD.
