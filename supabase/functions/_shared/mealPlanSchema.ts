// Structural validation for the meal-plan JSON shape (per AI.md's prompt template job 3).

import type { ValidationResult } from "./jsonRetry.ts";
import { validateRecipe, validateMacros, type Recipe, type RecipeMacros } from "./recipeSchema.ts";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
const SLOTS: ReadonlySet<string> = new Set(["breakfast", "lunch", "dinner", "snack"]);

export interface MealEntry {
  slot: MealSlot;
  recipe: Recipe;
}

export interface PlanDay {
  day: number;
  meals: MealEntry[];
  daily_macros: RecipeMacros;
}

export interface MealPlan {
  days: PlanDay[];
}

export function validateMealPlan(v: unknown): ValidationResult<MealPlan> {
  const errors: string[] = [];
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return { ok: false, errors: ["meal plan is not an object"] };
  }
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.days) || o.days.length === 0) {
    return { ok: false, errors: ["days missing/empty/not an array"] };
  }

  const days: PlanDay[] = [];

  o.days.forEach((d, i) => {
    if (typeof d !== "object" || d === null) {
      errors.push(`days[${i}] is not an object`);
      return;
    }
    const dd = d as Record<string, unknown>;

    if (typeof dd.day !== "number") errors.push(`days[${i}].day missing/invalid`);

    if (!Array.isArray(dd.meals) || dd.meals.length === 0) {
      errors.push(`days[${i}].meals missing/empty`);
      return;
    }

    const meals: MealEntry[] = [];
    dd.meals.forEach((m, j) => {
      if (typeof m !== "object" || m === null) {
        errors.push(`days[${i}].meals[${j}] is not an object`);
        return;
      }
      const mm = m as Record<string, unknown>;
      if (typeof mm.slot !== "string" || !SLOTS.has(mm.slot)) {
        errors.push(`days[${i}].meals[${j}].slot invalid`);
        return;
      }
      const recipeResult = validateRecipe(mm.recipe);
      if (!recipeResult.ok) {
        errors.push(`days[${i}].meals[${j}].recipe: ${recipeResult.errors.join("; ")}`);
        return;
      }
      meals.push({ slot: mm.slot as MealSlot, recipe: recipeResult.value });
    });

    if (meals.length === 0) return; // all meals in this day failed validation — drop the day

    const macroErrors: string[] = [];
    const macrosOk = validateMacros(dd.daily_macros, macroErrors, `days[${i}].daily_macros`);
    if (!macrosOk) {
      errors.push(...macroErrors);
      return;
    }

    days.push({ day: dd.day as number, meals, daily_macros: dd.daily_macros as RecipeMacros });
  });

  if (days.length === 0) {
    return { ok: false, errors: errors.length ? errors : ["no valid days found"] };
  }
  return { ok: true, value: { days } };
}
