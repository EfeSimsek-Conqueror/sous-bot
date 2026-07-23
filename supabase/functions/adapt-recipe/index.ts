// POST /adapt-recipe — url or photo (or an existing saved recipe_id) + transformation in,
// adapted recipe out. PRO-GATED. Must respect the user's allergy flags too (same hard-constraint
// + post-generation re-validation pattern as generate-recipes).

import { withHandler, readJsonBody } from "../_shared/handler.ts";
import { ApiError, ErrorCodes, jsonResponse } from "../_shared/errors.ts";
import { requireUser, getAdminClient } from "../_shared/supabaseAdmin.ts";
import { requirePro } from "../_shared/entitlements.ts";
import { callFalRouter, callFalVision, MODELS } from "../_shared/fal.ts";
import { parseWithRetry } from "../_shared/jsonRetry.ts";
import { validateRecipe, type Recipe } from "../_shared/recipeSchema.ts";
import { checkAllergyViolations } from "../_shared/allergens.ts";

interface AdaptRecipeRequest {
  recipe_id?: string; // adapt an existing saved recipe
  url?: string; // adapt a recipe found at this URL (best-effort text extraction)
  image_base64?: string; // adapt a recipe photographed by the user
  image_mime_type?: string;
  transformation: string; // e.g. "make it vegan", "half portions", "swap chicken for tofu", "air fryer version"
}

const MAX_ROUNDS = 3;
const MAX_SOURCE_CHARS = 6000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveOriginalRecipeText(
  body: AdaptRecipeRequest,
  userId: string,
  // deno-lint-ignore no-explicit-any
  admin: any,
): Promise<string> {
  if (body.recipe_id) {
    const { data, error } = await admin
      .from("recipes")
      .select("user_id, title, description, ingredients, steps, macros, prep_minutes, cook_minutes, servings, difficulty, tags")
      .eq("id", body.recipe_id)
      .maybeSingle();
    if (error) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to load recipe: ${error.message}`);
    if (!data) throw new ApiError(404, ErrorCodes.NOT_FOUND, "Recipe not found");
    if (data.user_id !== userId) throw new ApiError(403, ErrorCodes.FORBIDDEN, "Not your recipe");
    const { user_id: _drop, ...recipe } = data;
    return JSON.stringify(recipe);
  }

  if (body.url) {
    let res: Response;
    try {
      res = await fetch(body.url, { headers: { "User-Agent": "SousbotRecipeAdapter/1.0" } });
    } catch (e) {
      throw new ApiError(400, ErrorCodes.BAD_REQUEST, `Could not fetch url: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!res.ok) throw new ApiError(400, ErrorCodes.BAD_REQUEST, `Could not fetch url: HTTP ${res.status}`);
    const html = await res.text();
    return stripHtml(html).slice(0, MAX_SOURCE_CHARS);
  }

  if (body.image_base64) {
    const dataUri = body.image_base64.startsWith("data:")
      ? body.image_base64
      : `data:${body.image_mime_type ?? "image/jpeg"};base64,${body.image_base64}`;
    const visionRes = await callFalVision({
      model: MODELS.vision,
      image_urls: [dataUri],
      system_prompt:
        "Transcribe the full recipe visible in this photo as plain text: title, ingredients with quantities, and steps. No commentary, no markdown fences.",
      prompt: "Transcribe the recipe shown in this photo.",
      temperature: 0.2,
      max_tokens: 1200,
    });
    return visionRes.output.slice(0, MAX_SOURCE_CHARS);
  }

  throw new ApiError(400, ErrorCodes.BAD_REQUEST, "Provide one of recipe_id, url, or image_base64");
}

function buildSystemPrompt(allergies: string[], extraNote = ""): string {
  return `You are Sousbot's recipe adaptation engine. Output ONLY a single raw JSON object matching the
same Recipe schema as recipe generation, no markdown fences, no commentary.

HARD ALLERGY CONSTRAINTS — NEVER VIOLATE: ${JSON.stringify(allergies)}${extraNote ? `\n\n${extraNote}` : ""}`;
}

function buildUserPrompt(originalRecipeText: string, transformation: string): string {
  return `Original recipe (this may be structured JSON, or raw text extracted from a webpage/photo —
parse it first if needed, then adapt):
${originalRecipeText}

Adapt it for: ${transformation}

Keep the dish recognizably the same unless the request requires otherwise. Recalculate macros,
quantities, and steps to reflect the change. Respond with the JSON only, matching:
{
  "title": string, "description": string,
  "ingredients": [{ "name": string, "quantity": number, "unit": string }],
  "steps": string[],
  "macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "prep_minutes": number, "cook_minutes": number, "servings": number,
  "difficulty": "easy" | "medium" | "hard", "tags": string[]
}`;
}

async function adaptAllergySafe(opts: {
  originalRecipeText: string;
  transformation: string;
  allergies: string[];
}): Promise<Recipe> {
  let extraNote = "";
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const systemPrompt = buildSystemPrompt(opts.allergies, extraNote);
    const userPrompt = buildUserPrompt(opts.originalRecipeText, opts.transformation);

    const outcome = await parseWithRetry({
      attempts: [
        () => callFalRouter({ model: MODELS.text, system_prompt: systemPrompt, prompt: userPrompt, temperature: 0.3, max_tokens: 900 }).then((r) => r.output),
        () =>
          callFalRouter({
            model: MODELS.text,
            system_prompt: systemPrompt + "\n\nYour previous response was not valid JSON matching the schema. Return ONLY the corrected raw JSON object.",
            prompt: userPrompt,
            temperature: 0,
            max_tokens: 900,
          }).then((r) => r.output),
        () => callFalRouter({ model: MODELS.textFallback, system_prompt: systemPrompt, prompt: userPrompt, temperature: 0, max_tokens: 900 }).then((r) => r.output),
      ],
      validate: validateRecipe,
    });

    const violations = checkAllergyViolations(outcome.value, opts.allergies);
    if (violations.length === 0) return outcome.value;

    extraNote = `Your previous response violated a hard allergy constraint (matched: ${
      violations.map((v) => v.allergy).join(", ")
    }). Regenerate the FULL adapted recipe avoiding all listed allergens entirely.`;
  }

  throw new ApiError(
    502,
    ErrorCodes.ALLERGY_VIOLATION,
    "Could not adapt this recipe while respecting the allergy constraints after multiple attempts.",
  );
}

Deno.serve(
  withHandler(async (req) => {
    if (req.method !== "POST") throw new ApiError(405, ErrorCodes.BAD_REQUEST, "Use POST");

    const { userId } = await requireUser(req);
    const body = await readJsonBody<AdaptRecipeRequest>(req);
    if (!body.transformation || typeof body.transformation !== "string") {
      throw new ApiError(400, ErrorCodes.BAD_REQUEST, "transformation is required");
    }

    const admin = getAdminClient();
    await requirePro(admin, userId);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("allergies")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to load profile: ${profileError.message}`);
    const allergies: string[] = profile?.allergies ?? [];

    const originalRecipeText = await resolveOriginalRecipeText(body, userId, admin);
    const adapted = await adaptAllergySafe({ originalRecipeText, transformation: body.transformation, allergies });

    const { data: inserted, error: insertError } = await admin
      .from("recipes")
      .insert({
        user_id: userId,
        title: adapted.title,
        description: adapted.description,
        ingredients: adapted.ingredients,
        steps: adapted.steps,
        macros: adapted.macros,
        prep_minutes: adapted.prep_minutes,
        cook_minutes: adapted.cook_minutes,
        servings: adapted.servings,
        difficulty: adapted.difficulty,
        tags: adapted.tags,
        source: "adapted",
        generation_params: {
          transformation: body.transformation,
          source_recipe_id: body.recipe_id ?? null,
          source_url: body.url ?? null,
          allergies,
        },
      })
      .select("id, title, description, ingredients, steps, macros, prep_minutes, cook_minutes, servings, difficulty, tags, image_url, image_status, created_at")
      .single();

    if (insertError) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to persist adapted recipe: ${insertError.message}`);

    return jsonResponse(req, { recipe: inserted }, 200);
  }),
);
