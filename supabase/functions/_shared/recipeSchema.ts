// Structural validation for the Recipe JSON shape the LLM must return (per AI.md's prompt
// templates). Used by jsonRetry's `validate` callback — JSON.parse succeeding is necessary
// but not sufficient, we check field presence/types before anything is written to Postgres.

import type { ValidationResult } from "./jsonRetry.ts";

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

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

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function validateIngredient(v: unknown, errors: string[], path: string): v is RecipeIngredient {
  if (typeof v !== "object" || v === null) {
    errors.push(`${path} is not an object`);
    return false;
  }
  const o = v as Record<string, unknown>;
  let ok = true;
  if (!isNonEmptyString(o.name)) {
    errors.push(`${path}.name missing/invalid`);
    ok = false;
  }
  if (!isFiniteNumber(o.quantity)) {
    errors.push(`${path}.quantity missing/invalid`);
    ok = false;
  }
  if (!isNonEmptyString(o.unit)) {
    errors.push(`${path}.unit missing/invalid`);
    ok = false;
  }
  return ok;
}

export function validateMacros(v: unknown, errors: string[], path: string): v is RecipeMacros {
  if (typeof v !== "object" || v === null) {
    errors.push(`${path} is not an object`);
    return false;
  }
  const o = v as Record<string, unknown>;
  let ok = true;
  for (const key of ["calories", "protein_g", "carbs_g", "fat_g"] as const) {
    if (!isFiniteNumber(o[key])) {
      errors.push(`${path}.${key} missing/invalid`);
      ok = false;
    }
  }
  return ok;
}

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

/** Validates a single object as a Recipe. Collects all errors (doesn't short-circuit). */
export function validateRecipe(v: unknown): ValidationResult<Recipe> {
  const errors: string[] = [];
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return { ok: false, errors: ["recipe is not an object"] };
  }
  const o = v as Record<string, unknown>;

  if (!isNonEmptyString(o.title)) errors.push("title missing/invalid");
  if (typeof o.description !== "string") errors.push("description missing/invalid");

  if (!Array.isArray(o.ingredients) || o.ingredients.length === 0) {
    errors.push("ingredients missing/empty/not an array");
  } else {
    o.ingredients.forEach((ing, i) => validateIngredient(ing, errors, `ingredients[${i}]`));
  }

  if (!Array.isArray(o.steps) || o.steps.length === 0) {
    errors.push("steps missing/empty/not an array");
  } else if (!o.steps.every((s) => isNonEmptyString(s))) {
    errors.push("steps contains a non-string/empty entry");
  }

  validateMacros(o.macros, errors, "macros");

  if (!isFiniteNumber(o.prep_minutes)) errors.push("prep_minutes missing/invalid");
  if (!isFiniteNumber(o.cook_minutes)) errors.push("cook_minutes missing/invalid");
  if (!isFiniteNumber(o.servings)) errors.push("servings missing/invalid");

  if (typeof o.difficulty !== "string" || !DIFFICULTIES.has(o.difficulty)) {
    errors.push("difficulty missing/invalid (must be easy|medium|hard)");
  }

  if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === "string")) {
    errors.push("tags missing/invalid (must be string[])");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: o as unknown as Recipe };
}

/**
 * Validates the model's top-level response for generate-recipes, which per the prompt
 * template may be a single object (n=1) or a JSON array of objects (n>1). Always normalizes
 * to an array of Recipe on success.
 */
export function validateRecipeList(v: unknown, expectedCount?: number): ValidationResult<Recipe[]> {
  const candidates = Array.isArray(v) ? v : [v];
  const errors: string[] = [];
  const recipes: Recipe[] = [];

  candidates.forEach((c, i) => {
    const result = validateRecipe(c);
    if (result.ok) {
      recipes.push(result.value);
    } else {
      errors.push(`recipe[${i}]: ${result.errors.join("; ")}`);
    }
  });

  if (recipes.length === 0) {
    return { ok: false, errors: errors.length ? errors : ["no valid recipes found"] };
  }
  if (expectedCount !== undefined && recipes.length !== expectedCount) {
    // Not a hard failure by itself if we got at least one valid recipe and the model
    // legitimately omitted one it couldn't honor safely (per system prompt) — but if we
    // got fewer than expected AND have parse errors for the missing ones, surface them.
    if (errors.length > 0) {
      return { ok: false, errors };
    }
  }
  return { ok: true, value: recipes };
}
