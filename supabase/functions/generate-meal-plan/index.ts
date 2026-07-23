// POST /generate-meal-plan — preferences + pantry in, weekly plan + missing-items shopping
// list out. PRO-GATED. The shopping list is (plan ingredients) MINUS (pantry items), computed
// by the pure `_shared/shoppingList.ts` diff (unit/quantity merging of duplicates included).

import { withHandler, readJsonBody } from "../_shared/handler.ts";
import { ApiError, ErrorCodes, jsonResponse } from "../_shared/errors.ts";
import { requireUser, getAdminClient } from "../_shared/supabaseAdmin.ts";
import { requirePro } from "../_shared/entitlements.ts";
import { callFalRouter, MODELS } from "../_shared/fal.ts";
import { parseWithRetry } from "../_shared/jsonRetry.ts";
import { validateMealPlan, type MealPlan } from "../_shared/mealPlanSchema.ts";
import { checkAllergyViolations } from "../_shared/allergens.ts";
import { computeMissingIngredients, type PantryItem, type QuantifiedIngredient } from "../_shared/shoppingList.ts";

interface PantryInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  is_staple?: boolean;
}

interface GenerateMealPlanRequest {
  days?: number; // default 7, max 7
  meals_per_day?: number; // default 3, max 5
  macro_targets?: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
  pantry?: PantryInput[]; // optional override — if omitted, loads the user's stored pantry_items
  leftover_rescue?: boolean;
  week_start?: string; // ISO date; defaults to today
}

const MAX_DAYS = 7;
const MAX_MEALS_PER_DAY = 5;
const MAX_ROUNDS = 2; // allergy-driven full-plan regenerations — capped, a plan regen is expensive

const SYSTEM_PROMPT_BASE = `You are Sousbot's meal-plan engine. Output ONLY a single raw JSON object, no markdown fences,
no commentary.`;

function buildSystemPrompt(allergies: string[], diet: string, macroTargets: Record<string, unknown>, tasteProfileNote: string, extraNote = ""): string {
  return `${SYSTEM_PROMPT_BASE}

HARD ALLERGY CONSTRAINTS — NEVER VIOLATE: ${JSON.stringify(allergies)}
DIETARY CONSTRAINTS: ${diet || "none"}
DAILY MACRO TARGETS: ${JSON.stringify(macroTargets)}
TASTE PROFILE: ${tasteProfileNote}${extraNote ? `\n\n${extraNote}` : ""}`;
}

function buildUserPrompt(pantryNames: string[], days: number, mealsPerDay: number, leftoverRescue: boolean): string {
  const rescueNote = leftoverRescue ? " Prioritize using up pantry ingredients before suggesting new ones." : "";
  return `Available/pantry ingredients: ${pantryNames.join(", ") || "none listed"}.${rescueNote}
Plan ${days} day(s), ${mealsPerDay} meal(s) per day. Return JSON matching:
{
  "days": [
    {
      "day": number,
      "meals": [
        { "slot": "breakfast" | "lunch" | "dinner" | "snack", "recipe": {
          "title": string, "description": string,
          "ingredients": [{ "name": string, "quantity": number, "unit": string }],
          "steps": string[],
          "macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
          "prep_minutes": number, "cook_minutes": number, "servings": number,
          "difficulty": "easy" | "medium" | "hard", "tags": string[]
        } }
      ],
      "daily_macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number }
    }
  ]
}
Respond with the JSON only.`;
}

function planViolatesAllergies(plan: MealPlan, allergies: string[]): boolean {
  return plan.days.some((d) => d.meals.some((m) => checkAllergyViolations(m.recipe, allergies).length > 0));
}

async function generateAllergySafePlan(opts: {
  pantryNames: string[];
  days: number;
  mealsPerDay: number;
  leftoverRescue: boolean;
  allergies: string[];
  diet: string;
  macroTargets: Record<string, unknown>;
  tasteProfile: string;
}): Promise<MealPlan> {
  let extraNote = "";
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const systemPrompt = buildSystemPrompt(opts.allergies, opts.diet, opts.macroTargets, opts.tasteProfile, extraNote);
    const userPrompt = buildUserPrompt(opts.pantryNames, opts.days, opts.mealsPerDay, opts.leftoverRescue);

    const outcome = await parseWithRetry({
      attempts: [
        () => callFalRouter({ model: MODELS.text, system_prompt: systemPrompt, prompt: userPrompt, temperature: 0.3, max_tokens: 4000 }).then((r) => r.output),
        () =>
          callFalRouter({
            model: MODELS.text,
            system_prompt: systemPrompt + "\n\nYour previous response was not valid JSON matching the schema. Return ONLY the corrected raw JSON.",
            prompt: userPrompt,
            temperature: 0,
            max_tokens: 4000,
          }).then((r) => r.output),
        () => callFalRouter({ model: MODELS.textFallback, system_prompt: systemPrompt, prompt: userPrompt, temperature: 0, max_tokens: 4000 }).then((r) => r.output),
      ],
      validate: validateMealPlan,
    });

    if (!planViolatesAllergies(outcome.value, opts.allergies)) {
      return outcome.value;
    }
    extraNote = `Your previous plan included a recipe that violated a hard allergy constraint (${opts.allergies.join(", ")}). Regenerate the FULL plan avoiding all listed allergens in every meal.`;
  }

  throw new ApiError(
    502,
    ErrorCodes.ALLERGY_VIOLATION,
    "Could not generate a meal plan respecting the allergy constraints after multiple attempts.",
  );
}

Deno.serve(
  withHandler(async (req) => {
    if (req.method !== "POST") throw new ApiError(405, ErrorCodes.BAD_REQUEST, "Use POST");

    const { userId } = await requireUser(req);
    const body = await readJsonBody<GenerateMealPlanRequest>(req);
    const admin = getAdminClient();

    await requirePro(admin, userId);

    const days = Math.min(Math.max(body.days ?? 7, 1), MAX_DAYS);
    const mealsPerDay = Math.min(Math.max(body.meals_per_day ?? 3, 1), MAX_MEALS_PER_DAY);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("diet_flags, allergies")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to load profile: ${profileError.message}`);
    const allergies: string[] = profile?.allergies ?? [];
    const diet = (profile?.diet_flags ?? []).join(", ");

    let pantryRows: PantryInput[];
    if (Array.isArray(body.pantry)) {
      pantryRows = body.pantry;
    } else {
      const { data: pantryData, error: pantryError } = await admin
        .from("pantry_items")
        .select("name, quantity, unit, is_staple")
        .eq("user_id", userId);
      if (pantryError) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to load pantry: ${pantryError.message}`);
      pantryRows = pantryData ?? [];
    }

    const plan = await generateAllergySafePlan({
      pantryNames: pantryRows.map((p) => p.name),
      days,
      mealsPerDay,
      leftoverRescue: !!body.leftover_rescue,
      allergies,
      diet,
      macroTargets: body.macro_targets ?? {},
      tasteProfile: "not yet aggregated for meal plans", // taste profile aggregation lives in generate-recipes; meal plans lean on pantry+macros primarily
    });

    // Persist meal_plans + recipes + meal_plan_entries.
    const weekStart = body.week_start ?? new Date().toISOString().slice(0, 10);
    const { data: planRow, error: planInsertError } = await admin
      .from("meal_plans")
      .insert({ user_id: userId, week_start: weekStart })
      .select("id, week_start")
      .single();
    if (planInsertError) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to create meal plan: ${planInsertError.message}`);

    const allPlanIngredients: QuantifiedIngredient[] = [];
    const responseDays: unknown[] = [];

    for (const day of plan.days) {
      const meals: unknown[] = [];
      for (const meal of day.meals) {
        const r = meal.recipe;
        for (const ing of r.ingredients) {
          allPlanIngredients.push({ name: ing.name, quantity: ing.quantity, unit: ing.unit });
        }
        const { data: recipeRow, error: recipeInsertError } = await admin
          .from("recipes")
          .insert({
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
            source: "generated",
            generation_params: { via: "generate-meal-plan", plan_id: planRow.id, diet, allergies },
          })
          .select("id, title, description, ingredients, steps, macros, prep_minutes, cook_minutes, servings, difficulty, tags, image_url, image_status")
          .single();
        if (recipeInsertError) {
          throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to persist plan recipe: ${recipeInsertError.message}`);
        }

        const { error: entryError } = await admin.from("meal_plan_entries").insert({
          plan_id: planRow.id,
          recipe_id: recipeRow.id,
          day_of_week: day.day % 7,
          meal_slot: meal.slot,
        });
        if (entryError) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to persist plan entry: ${entryError.message}`);

        meals.push({ slot: meal.slot, recipe: recipeRow });
      }
      responseDays.push({ day: day.day, meals, daily_macros: day.daily_macros });
    }

    // Shopping list = plan ingredients MINUS pantry (pure diff, unit/quantity merged).
    const pantryForDiff: PantryItem[] = pantryRows.map((p) => ({
      name: p.name,
      quantity: p.quantity ?? null,
      unit: p.unit ?? null,
      is_staple: !!p.is_staple,
    }));
    const missing = computeMissingIngredients(allPlanIngredients, pantryForDiff);

    let shoppingListRows: unknown[] = [];
    if (missing.length > 0) {
      const { data: inserted, error: shoppingInsertError } = await admin
        .from("shopping_list_items")
        .insert(
          missing.map((item) => ({
            user_id: userId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            checked: false,
            source_plan_id: planRow.id,
          })),
        )
        .select("id, name, quantity, unit, checked, source_plan_id");
      if (shoppingInsertError) {
        throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to persist shopping list: ${shoppingInsertError.message}`);
      }
      shoppingListRows = inserted ?? [];
    }

    return jsonResponse(
      req,
      {
        meal_plan: { id: planRow.id, week_start: planRow.week_start, days: responseDays },
        shopping_list: shoppingListRows,
      },
      200,
    );
  }),
);
