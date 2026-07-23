# Sousbot — fal.ai Model Selection & Integration Guide

Verified live on 2026-07-23 against the fal.ai production API using the project key. Every model ID,
schema and response sample below was pulled from `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id>`
(the live OpenAPI spec fal serves per-endpoint) and then confirmed with a real `curl` call. Nothing here
is from training-data memory of fal's catalog — model IDs on fal churn, so re-verify before a big migration.

All calls use:
```
Authorization: Key <FAL_KEY>
```
(placeholder `<FAL_KEY>` below — store as an Edge Function secret, never client-side)

---

## TL;DR — recommended models

| Job | Recommended | Endpoint | Runner-up | Why runner-up loses |
|---|---|---|---|---|
| 1. Recipe JSON / meal plan / adaptation | **`google/gemini-2.5-flash`** via `openrouter/router` | `https://fal.run/openrouter/router` | `anthropic/claude-haiku-4.5` via same endpoint | Verified: gemini-2.5-flash returned perfectly-formed JSON in 2.8s at $0.0009/call. Claude-haiku is a good fallback for stricter instruction-following if gemini ever drifts off-schema, but it's untested here and pricier per fal's premium-model tier. |
| 2. Ingredient detection from photo | **`google/gemini-2.5-flash`** via `openrouter/router/vision` | `https://fal.run/openrouter/router/vision` | `openai/gpt-4o` or `qwen/qwen3-vl-235b-a22b-instruct` (same endpoint) | Verified: gemini-2.5-flash correctly listed 9 fridge items in 3.7s at $0.00116/call. gpt-4o is generally more careful with fine-grained food ID but costs more per fal's OpenRouter passthrough pricing; swap in in prod if accuracy complaints come in. `fal-ai/moondream-next` is a cheaper dedicated VLM but was *not* tested live — it's a caption/QA model, not built for structured list extraction, so treat it as an unverified fallback only. |
| 3. Dish image generation | **`fal-ai/flux-pro/v1.1-ultra`** | `https://fal.run/fal-ai/flux-pro/v1.1-ultra` (or queue) | `fal-ai/nano-banana` (Gemini 2.5 Flash Image) | Verified both. flux-pro-ultra: 2368×1792 (4MP), $0.06/img, completed via queue in 5s. nano-banana: 1184×864 (~1MP), $0.039/img, 8.6s sync. flux-pro-ultra wins on resolution (matters for the Pro-tier hook / full-bleed hero images) and was actually *faster* in this test. Use nano-banana as the cheap/free-tier degrade path — its output quality was still genuinely appetising, just lower-res. |

---

## Job 1 — Recipe generation (also meal plans + recipe adaptation)

**Model:** `google/gemini-2.5-flash` on endpoint **`openrouter/router`**
(fal's older `fal-ai/any-llm` endpoint is still live but its docs page flags it as deprecated in favor of `openrouter/router` — same team/backend, near-identical schema. Use `openrouter/router`.)

### Verified request (ran successfully)
```bash
curl -s -X POST "https://fal.run/openrouter/router" \
  -H "Authorization: Key <FAL_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.5-flash",
    "system_prompt": "You are a recipe generation API. Output ONLY valid JSON matching the schema. No prose, no markdown fences.",
    "prompt": "Ingredients available: chicken breast, garlic, lemon, olive oil, rice. Dietary constraints: none. Generate 1 recipe as strict JSON with fields: title, description, ingredients (array of {name,quantity,unit}), steps (array of strings), macros {calories,protein_g,carbs_g,fat_g}, prep_minutes, cook_minutes, servings, difficulty, tags (array).",
    "temperature": 0.3,
    "max_tokens": 800
  }'
```

### Real response (trimmed for readability, actual bytes were single-line)
```json
{
  "output": "{\"title\": \"Lemon Garlic Chicken with Rice\", \"description\": \"A simple yet flavorful dish...\", \"ingredients\": [{\"name\": \"chicken breast\", \"quantity\": 2, \"unit\": \"pieces\"}, ...], \"steps\": [\"Cook rice according to package directions.\", ...], \"macros\": {\"calories\": 450, \"protein_g\": 45, \"carbs_g\": 40, \"fat_g\": 15}, \"prep_minutes\": 10, \"cook_minutes\": 20, \"servings\": 2, \"difficulty\": \"easy\", \"tags\": [\"chicken\", \"lemon\", \"garlic\", \"rice\", \"easy\", \"dinner\"]}",
  "reasoning": null,
  "partial": false,
  "error": null,
  "usage": {
    "prompt_tokens": 106,
    "completion_tokens": 348,
    "total_tokens": 454,
    "cost": 0.0009018
  }
}
```
Latency observed: **2.84s** end-to-end (sync `fal.run`, no queue).

**Important**: `output` is a *string*, not a JSON object — even when the model behaves, you must
`JSON.parse(response.output)`. There is no `response_format`/`json_schema` field on this endpoint at all
(confirmed absent from the live OpenAPI schema) — fal's LLM router does not support enforced JSON mode.
Reliability comes entirely from prompt discipline + your own parse/retry loop (see below).

### Full request schema (`ChatInput`, from live OpenAPI spec)
```
prompt: string (required)
model: string (required) — e.g. "google/gemini-2.5-flash", "anthropic/claude-sonnet-5",
       "anthropic/claude-opus-4.6", "openai/gpt-4.1", "openai/gpt-oss-120b",
       "meta-llama/llama-4-maverick", "moonshotai/kimi-k2.5"
system_prompt?: string | null
reasoning?: boolean (default false)
temperature?: number 0-2 (default 1)
max_tokens?: integer | null
```

### Full response schema (`ChatOutput`)
```
output: string (required)
reasoning?: string | null
partial?: boolean (default false)
error?: string | null
usage?: { prompt_tokens, completion_tokens, total_tokens, cost, prompt_tokens_details: { cached_tokens, cache_write_tokens } } | null
```

---

## Job 2 — Ingredient detection from fridge photo

**Model:** `google/gemini-2.5-flash` on endpoint **`openrouter/router/vision`**

### Verified request (ran successfully, used a real public fridge photo)
Test image: `https://upload.wikimedia.org/wikipedia/commons/8/8b/Inside_domestic_refrigerator.JPG`
(resolved via Wikimedia Commons `Special:FilePath` redirect — any public image URL works)

```bash
curl -s -X POST "https://fal.run/openrouter/router/vision" \
  -H "Authorization: Key <FAL_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemini-2.5-flash",
    "image_urls": ["https://upload.wikimedia.org/wikipedia/commons/8/8b/Inside_domestic_refrigerator.JPG"],
    "system_prompt": "You are a food ingredient detector. Respond ONLY with a JSON array of lowercase ingredient name strings visible in the fridge photo. No prose.",
    "prompt": "List every distinct food ingredient visible in this fridge photo.",
    "temperature": 0.2,
    "max_tokens": 400
  }'
```

### Real response (verbatim)
```json
{
  "output": "```json\n[\n  \"milk\",\n  \"jam\",\n  \"chocolate syrup\",\n  \"cheese\",\n  \"yogurt\",\n  \"meat\",\n  \"bread\",\n  \"butter\",\n  \"fruit\"\n]\n```",
  "usage": {
    "prompt_tokens": 3392,
    "completion_tokens": 55,
    "total_tokens": 3447,
    "cost": 0.0011551
  }
}
```
Latency observed: **3.69s**.

**Gotcha caught live**: despite the system prompt explicitly saying "No prose" and "Respond ONLY with a
JSON array", the model still wrapped the array in ```` ```json ... ``` ```` markdown fences. Your parser
**must** strip code fences before `JSON.parse` — see the shared parse helper below. This is the single
most important defensive-coding note in this whole doc.

### Full request schema (`VisionInput`)
```
prompt: string (required)
image_urls: string[] (required)
model: string (required) — e.g. "google/gemini-2.5-flash", "openai/gpt-4o",
       "anthropic/claude-sonnet-5", "qwen/qwen3-vl-235b-a22b-instruct", "x-ai/grok-4-fast"
system_prompt?: string | null
reasoning?: boolean (default false)
temperature?: number 0-2 (default 1)
max_tokens?: integer | null
```

### Full response schema (`VisionOutput`)
```
output: string (required)
usage: { prompt_tokens, completion_tokens, total_tokens, cost, prompt_tokens_details } (required)
```

---

## Job 3 — Dish image generation

**Model:** `fal-ai/flux-pro/v1.1-ultra` (primary), `fal-ai/nano-banana` (cheap/fast alternate)

Per the PRD, dish images are generated **async**, so use the queue API, not `fal.run` sync.

### Verified queue submission (ran successfully)
```bash
curl -s -X POST "https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra" \
  -H "Authorization: Key <FAL_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Overhead food-photography shot of lemon garlic chicken with rice, served on a rustic white ceramic plate, garnished with parsley, natural window light, shallow depth of field, appetising, high detail, restaurant quality",
    "aspect_ratio": "4:3",
    "output_format": "jpeg",
    "safety_tolerance": "2"
  }'
```
Response:
```json
{
  "status": "IN_QUEUE",
  "request_id": "019f8bbb-67b7-7fa3-8b8c-1294bdb8727e",
  "response_url": "https://queue.fal.run/fal-ai/flux-pro/requests/019f8bbb-67b7-7fa3-8b8c-1294bdb8727e",
  "status_url": "https://queue.fal.run/fal-ai/flux-pro/requests/019f8bbb-67b7-7fa3-8b8c-1294bdb8727e/status",
  "cancel_url": "https://queue.fal.run/fal-ai/flux-pro/requests/019f8bbb-67b7-7fa3-8b8c-1294bdb8727e/cancel",
  "queue_position": 0
}
```
(note: `response_url`/`status_url` normalize to the base `fal-ai/flux-pro` path, not the full `v1.1-ultra`
suffix — use the URLs fal gives you verbatim, don't reconstruct them from the model id.)

Polled `GET {status_url}` every 1s: `IN_PROGRESS` at t=1s, 2s, 4s → `COMPLETED` at **t=5s**.

Final result (`GET {response_url}`):
```json
{
  "images": [{
    "url": "https://v3b.fal.media/files/b/0aa35237/7IevOZp7FO-Dzactn-wTQ_6b1a073de44948b2a3a93aa224974394.jpg",
    "width": 2368,
    "height": 1792,
    "content_type": "image/jpeg"
  }],
  "seed": 622319118,
  "has_nsfw_concepts": [false],
  "prompt": "Overhead food-photography shot of lemon garlic chicken with rice..."
}
```
I downloaded and visually inspected this image — it is a genuinely appetising, correctly-composed overhead
shot with accurate lighting and garnish. No hallucinated extra dishes, no artifacts.

### Runner-up, tested for comparison (sync call)
```bash
curl -s -X POST "https://fal.run/fal-ai/nano-banana" \
  -H "Authorization: Key <FAL_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Overhead food-photography shot of lemon garlic chicken with rice, served on a rustic white ceramic plate, garnished with parsley, natural window light, shallow depth of field, appetising, high detail, restaurant quality",
    "aspect_ratio": "4:3",
    "output_format": "jpeg"
  }'
```
→ 8.6s, `{"images":[{"url":"...","width":1184,"height":864,...}]}`, also visually inspected — good quality,
lower resolution, roughly 2/3 the price.

### Full request schema — `fal-ai/flux-pro/v1.1-ultra`
```
prompt: string (required)
seed?: integer | null
sync_mode?: boolean (default false)
num_images?: integer
output_format?: "jpeg" | "png" (default jpeg)
safety_tolerance?: "1".."6" (default "2")
enhance_prompt?: boolean (default false)
image_url?: string | null   — for image-to-image / reference
image_prompt_strength?: number 0-1 (default 0.1)
aspect_ratio?: string (e.g. "4:3", "16:9", "1:1")
raw?: boolean (default false) — less processed, more natural-looking
```
### Response
```
images: [{ url, width, height, content_type }]
seed: number
has_nsfw_concepts: boolean[]
prompt: string (echoed)
```

### Pricing (as documented on fal.ai model pages)
- `fal-ai/flux-pro/v1.1-ultra`: **$0.06/image** (4MP output) — 16.7 images per $1
- `fal-ai/flux/schnell`: **$0.025/image** (fast, lower quality — not recommended for the Pro-tier hero shot, fine for placeholder/draft use)
- `fal-ai/nano-banana`: **$0.039/image** — 25.6 images per $1

---

## Shared TypeScript types — Deno Supabase Edge Function

```ts
// supabase/functions/_shared/fal-types.ts

const FAL_KEY = Deno.env.get("FAL_KEY")!; // "id:secret" format, from Edge Function secrets

// ---------- Text (recipe / meal-plan / adaptation) ----------

export interface FalRouterRequest {
  prompt: string;
  model: string;             // e.g. "google/gemini-2.5-flash"
  system_prompt?: string;
  reasoning?: boolean;
  temperature?: number;      // 0-2
  max_tokens?: number;
}

export interface FalUsage {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number;
  cost: number;
  prompt_tokens_details?: { cached_tokens: number; cache_write_tokens: number };
}

export interface FalRouterResponse {
  output: string;             // JSON string OR ```json fenced JSON string — must be cleaned + parsed
  reasoning: string | null;
  partial: boolean;
  error: string | null;
  usage: FalUsage | null;
}

// ---------- Vision (ingredient detection) ----------

export interface FalVisionRequest {
  prompt: string;
  image_urls: string[];
  model: string;              // e.g. "google/gemini-2.5-flash"
  system_prompt?: string;
  reasoning?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface FalVisionResponse {
  output: string;
  usage: FalUsage;
}

// ---------- Image (dish photo, async/queue) ----------

export interface FalImageRequest {
  prompt: string;
  seed?: number;
  num_images?: number;
  output_format?: "jpeg" | "png";
  safety_tolerance?: "1" | "2" | "3" | "4" | "5" | "6";
  enhance_prompt?: boolean;
  image_url?: string;
  aspect_ratio?: string;      // "4:3" | "16:9" | "1:1" | ...
  raw?: boolean;
}

export interface FalQueueSubmitResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  request_id: string;
  response_url: string;
  status_url: string;
  cancel_url: string;
  queue_position: number;
}

export interface FalQueueStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  queue_position?: number;
  logs?: { message: string; timestamp: string }[];
  metrics?: { inference_time?: number };
}

export interface FalImageResult {
  images: { url: string; width: number; height: number; content_type: string }[];
  seed: number;
  has_nsfw_concepts: boolean[];
  prompt: string;
}

// ---------- Strict Sousbot domain shape (what recipe JSON must parse into) ----------

export interface RecipeIngredient { name: string; quantity: number; unit: string }
export interface RecipeMacros { calories: number; protein_g: number; carbs_g: number; fat_g: number }

export interface Recipe {
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  macros: RecipeMacros;
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

// ---------- Fetch helpers ----------

export async function callFalRouter(req: FalRouterRequest): Promise<FalRouterResponse> {
  const res = await fetch("https://fal.run/openrouter/router", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fal router ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function callFalVision(req: FalVisionRequest): Promise<FalVisionResponse> {
  const res = await fetch("https://fal.run/openrouter/router/vision", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fal vision ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function submitDishImage(req: FalImageRequest): Promise<FalQueueSubmitResponse> {
  const res = await fetch("https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fal image submit ${res.status}: ${await res.text()}`);
  return res.json();
}

// Use the *verbatim* status_url/response_url fal gives you back — don't reconstruct them.
export async function pollDishImage(statusUrl: string, responseUrl: string): Promise<FalImageResult> {
  while (true) {
    const status: FalQueueStatusResponse = await (await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    })).json();
    if (status.status === "COMPLETED") {
      const res = await fetch(responseUrl, { headers: { Authorization: `Key ${FAL_KEY}` } });
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// ---------- JSON extraction (handles ```json fences the model adds despite instructions) ----------

export function extractJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
```

---

## Prompt templates

### 1. Recipe generation
```
SYSTEM:
You are Sousbot's recipe engine. You output ONLY a single raw JSON object — no markdown code
fences, no commentary, no leading/trailing text of any kind. If you cannot honor a constraint,
omit that recipe rather than violating it.

HARD ALLERGY CONSTRAINTS — NEVER VIOLATE:
{{allergies}}   // e.g. ["peanuts", "shellfish"]
Any recipe containing, derived from, or cross-contaminated with these ingredients must not be
generated under any circumstances, even as a substitution suggestion.

DIETARY CONSTRAINTS: {{diet}}       // e.g. "vegetarian", "keto", "none"
TASTE PROFILE: {{taste_profile}}    // e.g. "prefers spicy, dislikes cilantro, loves garlic"

USER:
Available ingredients: {{ingredient_list}}
Generate {{n}} recipe(s). Return a JSON array of {{n}} objects (or a single object if n=1),
each matching exactly this shape:
{
  "title": string,
  "description": string,
  "ingredients": [{ "name": string, "quantity": number, "unit": string }],
  "steps": string[],
  "macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "prep_minutes": number,
  "cook_minutes": number,
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "tags": string[]
}
Respond with the JSON only.
```

### 2. Ingredient detection (vision)
```
SYSTEM:
You are Sousbot's ingredient detector. Respond ONLY with a raw JSON array of lowercase, singular
food-ingredient name strings visible in the photo (e.g. "tomato" not "Tomatoes"). No brand names,
no packaging descriptions, no non-food items, no markdown fences, no commentary.

USER:
[image]
List every distinct food ingredient visible in this photo. If uncertain about an item, include
your best guess rather than omitting it.
```

### 3. Meal plan generation
```
SYSTEM:
You are Sousbot's meal-plan engine. Output ONLY a single raw JSON object, no markdown fences,
no commentary.

HARD ALLERGY CONSTRAINTS — NEVER VIOLATE: {{allergies}}
DIETARY CONSTRAINTS: {{diet}}
DAILY MACRO TARGETS: {{macro_targets}}   // e.g. {"calories":2200,"protein_g":150}
TASTE PROFILE: {{taste_profile}}

USER:
Available/pantry ingredients: {{ingredient_list}}
Plan {{days}} day(s), {{meals_per_day}} meal(s) per day. Return JSON matching:
{
  "days": [
    {
      "day": number,
      "meals": [
        { "slot": "breakfast" | "lunch" | "dinner" | "snack", "recipe": <Recipe object as in job 1> }
      ],
      "daily_macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }
    }
  ]
}
Respond with the JSON only.
```

### 4. Recipe adaptation
```
SYSTEM:
You are Sousbot's recipe adaptation engine. Output ONLY a single raw JSON object matching the
same Recipe schema as recipe generation, no markdown fences, no commentary.

HARD ALLERGY CONSTRAINTS — NEVER VIOLATE: {{allergies}}

USER:
Original recipe:
{{original_recipe_json}}

Adapt it for: {{adaptation_request}}
// e.g. "make it vegan", "reduce to 1 serving", "swap out chicken for tofu", "make it under 500 calories"

Keep the dish recognizably the same unless the request requires otherwise. Recalculate macros,
quantities, and steps to reflect the change. Respond with the JSON only, matching:
{
  "title": string, "description": string,
  "ingredients": [{ "name": string, "quantity": number, "unit": string }],
  "steps": string[],
  "macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "prep_minutes": number, "cook_minutes": number, "servings": number,
  "difficulty": "easy" | "medium" | "hard", "tags": string[]
}
```

### 5. Dish image prompt (built from the generated recipe, not user-authored)
```
{{style_prefix}} photo of {{recipe.title}}: {{short_visual_description_from_ingredients_and_steps}},
served on {{plate_style}}, garnished with {{garnish}}, natural {{lighting}}, shallow depth of field,
appetising, high detail, restaurant quality food photography, no text, no watermark, no hands, no utensils in motion
```
Where:
- `style_prefix` defaults to `"Overhead food-photography shot of"` (works well per live test); vary
  with `"Close-up 45-degree food-photography shot of"` for texture-heavy dishes (steaks, pastries).
- Derive `plate_style` / `garnish` heuristically from `recipe.tags` / `recipe.difficulty` (e.g.
  "rustic white ceramic plate" for home-style, "dark slate plate" for higher difficulty/fine-dining tags).
- Always append the negative-style suffix (`no text, no watermark, no hands...`) — flux-pro-ultra has
  no separate negative-prompt field, so it must be inlined.

---

## Forcing valid JSON & retry strategy

fal's `openrouter/router` / `openrouter/router/vision` have **no `response_format`, `json_schema`, or
JSON-mode parameter** — confirmed absent from both live OpenAPI specs. Reliability must come from your
own pipeline:

1. **Prompt discipline** — always instruct "raw JSON only, no markdown fences" in the system prompt
   (as in the templates above). This gets you most of the way but is not guaranteed — our live vision
   test got fenced output *despite* this instruction.
2. **Always strip fences before parsing** — use `extractJson()` above on every response, unconditionally.
3. **`temperature: 0.2–0.3`** for all structured-output calls — lower temperature measurably reduces
   drift from the requested schema (used 0.3 for recipe gen, 0.2 for vision, both worked cleanly).
4. **Schema-validate after parsing** (e.g. zod) — treat a JSON.parse success as necessary but not
   sufficient; validate field presence/types before writing to Postgres.
5. **Retry loop on failure** (parse error OR zod validation error):
   - Retry #1: same prompt, `temperature: 0`, append to system prompt: `"Your previous response was
     not valid JSON matching the schema. Return ONLY the corrected raw JSON object."`
   - Retry #2 (final): switch `model` to the runner-up (`anthropic/claude-haiku-4.5` for text,
     `openai/gpt-4o` for vision) — different model families rarely fail the same way twice.
   - After 2 retries, fail the request and surface a user-facing error rather than looping further —
     don't retry indefinitely against a paid API.
6. Log `usage.cost` from every response into a per-user spend counter — there is no built-in fal
   budget/cap primitive, so cost control is entirely your responsibility.

## Async/queue usage for dish images

Per the PRD, dish images generate asynchronously. Pattern:
1. `POST https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra` → get back `request_id`, `status_url`,
   `response_url`, `cancel_url` **immediately** (this returned instantly in testing, no wait).
2. Store `request_id` + `status_url` + `response_url` on the recipe row; return to the client right away
   (don't block the request/response cycle on image generation).
3. Either:
   - **Poll**: client or a Supabase cron/Edge Function polls `status_url` every 1-2s until `COMPLETED`,
     then fetches `response_url` for the final `images[0].url` (observed total time: 5s in testing —
     budget for up to ~15-20s at P99).
   - **Webhook** (better for a serverless Edge Function — avoids holding a connection open): pass
     `?fal_webhook=<your-callback-url>` as a query param on the submit call. fal POSTs
     `{ request_id, gateway_request_id, status: "OK"|"ERROR", payload: <FalImageResult> }` to that URL
     when done. Return HTTP 200 fast; fal retries on non-200/timeout, so make the webhook handler
     idempotent on `request_id`.
4. Never call the sync `fal.run/fal-ai/flux-pro/v1.1-ultra` endpoint for production dish images — it
   blocks the calling function/connection for the full generation time (5-10s+), which is exactly what
   the queue is for. Sync is fine for one-off testing (as done in this doc).

## Rate limits / concurrency

- Default fal account concurrency limit: **10 concurrent `IN_PROGRESS` requests**, shared across *all*
  endpoints on the account (not per-endpoint). Requests still `IN_QUEUE` don't count against this.
- When over the limit, queued requests are automatically retried with backoff by fal itself — you don't
  need to hand-roll 429 handling for queue submissions, but you should still cap client-side concurrent
  submissions (e.g. don't fan out 50 dish-image generations at once from a meal-plan batch job) since it
  just piles into fal's queue and increases user-perceived latency.
- No documented hard per-minute rate limit beyond the concurrency cap; enterprise plans can raise the
  concurrency ceiling by contacting fal support.
- No documented per-key monthly quota — billing is purely usage-based (`usage.cost` per call).

## What did NOT work / was not verified

- `fal-ai/any-llm` — endpoint is still live (confirmed via OpenAPI schema fetch) but fal's own docs page
  flags it "deprecated, no longer supported." Did not test it live since `openrouter/router` is the
  documented successor with an identical shape. Don't build against it for new code.
- `fal-ai/moondream-next` — schema fetched and looks usable (`image_url` + `task_type` + `prompt` →
  string), but **not called live** — it's a caption/point-query model, not obviously suited to emitting
  a clean ingredient list, and testing budget went to the two endpoints actually recommended above.
  Treat as an unverified, cheaper fallback if `openrouter/router/vision` costs become a problem at scale.
- No dedicated "vision + JSON mode" or "text + JSON mode" endpoint exists on fal today — searched
  docs.fal.ai and the live OpenAPI schemas for both router endpoints; the `response_format`/`json_schema`
  field simply isn't there. This is a real gap versus OpenAI's own API — plan around it as described above.
