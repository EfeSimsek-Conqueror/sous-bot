// POST /generate-recipes — ingredients + constraints in, N structured recipes out.
// GATED + METERED: free tier = 10 generations/month (enforced via the shared entitlement +
// usage-metering helpers). Injects taste profile, diet flags and allergies into the prompt;
// allergies are hard constraints, re-validated post-generation — a violating recipe is
// rejected and regenerated (capped rounds, never infinite).

import { withHandler, readJsonBody } from "../_shared/handler.ts";
import { ApiError, ErrorCodes, jsonResponse } from "../_shared/errors.ts";
import { requireUser, getAdminClient } from "../_shared/supabaseAdmin.ts";
import { callFalRouter, MODELS } from "../_shared/fal.ts";
import { parseWithRetry } from "../_shared/jsonRetry.ts";
import { validateRecipeList, type Recipe } from "../_shared/recipeSchema.ts";
import { checkAllergyViolations } from "../_shared/allergens.ts";
import {
  checkEntitlement,
  checkAndIncrementGenerationUsage,
  assertUsageAllowed,
} from "../_shared/entitlements.ts";

interface GenerateRecipesRequest {
  ingredients: string[];
  n?: number; // default 3, max 6
  constraints?: {
    diet?: string; // overrides/augments profile.diet_flags for this call if provided
    leftover_rescue?: boolean; // prioritize using up what's on hand
  };
}

const MAX_N = 6;
const MAX_ALLERGY_ROUNDS = 3;

const SYSTEM_PROMPT_BASE = `You are Sousbot's recipe engine. You output ONLY a single raw JSON object or array — no markdown code
fences, no commentary, no leading/trailing text of any kind. If you cannot honor a constraint,
omit that recipe rather than violating it.`;

function buildSystemPrompt(allergies: string[], diet: string, tasteProfile: string, extraNote = ""): string {
  return `${SYSTEM_PROMPT_BASE}

HARD ALLERGY CONSTRAINTS — NEVER VIOLATE:
${JSON.stringify(allergies)}
Any recipe containing, derived from, or cross-contaminated with these ingredients must not be
generated under any circumstances, even as a substitution suggestion.

DIETARY CONSTRAINTS: ${diet || "none"}
TASTE PROFILE: ${tasteProfile}${extraNote ? `\n\n${extraNote}` : ""}`;
}

function buildUserPrompt(ingredients: string[], n: number, leftoverRescue: boolean): string {
  const rescueNote = leftoverRescue
    ? " Prioritize using up ALL the listed ingredients before anything else (leftover-rescue style) to minimize food waste."
    : "";
  return `Available ingredients: ${ingredients.join(", ")}.${rescueNote}
Generate ${n} recipe(s). Return a JSON array of ${n} objects (or a single object if n=1),
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
Respond with the JSON only.`;
}

function summarizeTopTerms(items: string[], topN = 5): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const term of item.split("/")) {
      const t = term.trim().toLowerCase();
      if (!t) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([t]) => t)
    .join(", ");
}

// deno-lint-ignore no-explicit-any
async function buildTasteProfile(admin: any, userId: string): Promise<string> {
  const { data, error } = await admin
    .from("taste_events")
    .select("verdict, recipes(title, tags)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) return "No taste history yet.";

  const liked: string[] = [];
  const disliked: string[] = [];
  for (const row of data as Array<{ verdict: string; recipes: { title: string; tags: string[] } | null }>) {
    const r = row.recipes;
    if (!r) continue;
    const label = r.tags && r.tags.length > 0 ? r.tags.join("/") : r.title;
    if (row.verdict === "like") liked.push(label);
    else disliked.push(label);
  }

  const likedSummary = summarizeTopTerms(liked);
  const dislikedSummary = summarizeTopTerms(disliked);
  const parts: string[] = [];
  if (likedSummary) parts.push(`prefers ${likedSummary}`);
  if (dislikedSummary) parts.push(`dislikes ${dislikedSummary}`);
  return parts.length > 0 ? parts.join("; ") : "No clear taste signal yet.";
}

async function generateAllergySafeRecipes(opts: {
  ingredients: string[];
  n: number;
  leftoverRescue: boolean;
  allergies: string[];
  diet: string;
  tasteProfile: string;
}): Promise<Recipe[]> {
  const collected: Recipe[] = [];
  let remaining = opts.n;
  let extraNote = "";

  for (let round = 0; round < MAX_ALLERGY_ROUNDS && remaining > 0; round++) {
    const systemPrompt = buildSystemPrompt(opts.allergies, opts.diet, opts.tasteProfile, extraNote);
    const userPrompt = buildUserPrompt(opts.ingredients, remaining, opts.leftoverRescue);

    const outcome = await parseWithRetry({
      attempts: [
        () =>
          callFalRouter({ model: MODELS.text, system_prompt: systemPrompt, prompt: userPrompt, temperature: 0.3, max_tokens: 800 * remaining })
            .then((r) => r.output),
        () =>
          callFalRouter({
            model: MODELS.text,
            system_prompt:
              systemPrompt +
              "\n\nYour previous response was not valid JSON matching the schema. Return ONLY the corrected raw JSON.",
            prompt: userPrompt,
            temperature: 0,
            max_tokens: 800 * remaining,
          }).then((r) => r.output),
        () =>
          callFalRouter({ model: MODELS.textFallback, system_prompt: systemPrompt, prompt: userPrompt, temperature: 0, max_tokens: 800 * remaining })
            .then((r) => r.output),
      ],
      validate: (v) => validateRecipeList(v),
    });

    const batch = outcome.value;
    let rejectedAny = false;
    for (const recipe of batch) {
      if (collected.length >= opts.n) break;
      const violations = checkAllergyViolations(recipe, opts.allergies);
      if (violations.length > 0) {
        rejectedAny = true;
        continue; // never store/return an allergy-violating recipe
      }
      collected.push(recipe);
    }

    remaining = opts.n - collected.length;
    if (rejectedAny && remaining > 0) {
      extraNote = `Your previous response included a recipe that violated a hard allergy constraint (${
        opts.allergies.join(", ")
      }). Generate ${remaining} NEW recipe(s) that fully avoid all listed allergens.`;
    }
  }

  if (collected.length === 0) {
    throw new ApiError(
      502,
      ErrorCodes.ALLERGY_VIOLATION,
      "Could not generate a recipe respecting the allergy constraints after multiple attempts.",
    );
  }
  return collected;
}

Deno.serve(
  withHandler(async (req) => {
    if (req.method !== "POST") throw new ApiError(405, ErrorCodes.BAD_REQUEST, "Use POST");

    const { userId } = await requireUser(req);
    const body = await readJsonBody<GenerateRecipesRequest>(req);

    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      throw new ApiError(400, ErrorCodes.BAD_REQUEST, "ingredients must be a non-empty array");
    }
    const n = Math.min(Math.max(body.n ?? 3, 1), MAX_N);

    const admin = getAdminClient();

    // Entitlement + metering (the one shared checkEntitlement function, per PRD).
    const entitlement = await checkEntitlement(admin, userId);
    const usage = await checkAndIncrementGenerationUsage(admin, userId, { isPro: entitlement.isPro });
    assertUsageAllowed(usage);

    // Pull profile (diet flags + allergies) — never trust client-supplied allergy overrides.
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("diet_flags, allergies")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) {
      throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to load profile: ${profileError.message}`);
    }
    const allergies: string[] = profile?.allergies ?? [];
    const dietFlags: string[] = profile?.diet_flags ?? [];
    const diet = [...dietFlags, body.constraints?.diet].filter(Boolean).join(", ");

    const tasteProfile = await buildTasteProfile(admin, userId);

    const recipes = await generateAllergySafeRecipes({
      ingredients: body.ingredients,
      n,
      leftoverRescue: !!body.constraints?.leftover_rescue,
      allergies,
      diet,
      tasteProfile,
    });

    const rowsToInsert = recipes.map((r) => ({
      user_id: userId,
      title: r.title,
      description: r.description,
      ingredients: r.ingredients,
      steps: r.steps,
      macros: r.macros,
      prep_minutes: r.prep_minutes,
      cook_minutes: r.cook_minutes,
      servings: r.servings,
      difficulty: r.difficulty,
      tags: r.tags,
      source: "generated" as const,
      generation_params: {
        ingredients: body.ingredients,
        n,
        constraints: body.constraints ?? null,
        diet,
        allergies,
        taste_profile: tasteProfile,
        model: MODELS.text,
      },
    }));

    const { data: inserted, error: insertError } = await admin
      .from("recipes")
      .insert(rowsToInsert)
      .select("id, title, description, ingredients, steps, macros, prep_minutes, cook_minutes, servings, difficulty, tags, image_url, image_status, created_at");

    if (insertError) {
      throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to persist recipes: ${insertError.message}`);
    }

    return jsonResponse(
      req,
      {
        recipes: inserted,
        usage: {
          used: usage.count,
          limit: usage.limit, // null when unmetered (Pro)
          remaining: usage.limit === null ? null : Math.max(0, usage.limit - usage.count),
        },
      },
      200,
    );
  }),
);
