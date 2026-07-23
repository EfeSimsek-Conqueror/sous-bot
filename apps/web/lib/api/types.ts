// Typed request/response contracts for every Edge Function, mirrored from
// supabase/functions/*/index.ts (source of truth — detect-ingredients and
// generate-recipes are read directly from the deployed code; generate-dish-image,
// generate-meal-plan and adapt-recipe are not implemented server-side yet at
// the time this client was written, so their shapes follow the documented
// contract in the task brief + the established pattern of the two live
// functions. Reconcile against supabase/functions/README.md once it exists.)
import type { Difficulty, Macros, MealSlot, RecipeIngredient } from "../types/db";

// ---------------------------------------------------------------------------
// Error envelope — every Edge Function returns { error: { code, message } }
// on failure (see supabase/functions/_shared/errors.ts).
// ---------------------------------------------------------------------------
export const ErrorCodes = {
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  FORBIDDEN_NOT_PRO: "forbidden_not_pro",
  GENERATION_LIMIT_REACHED: "generation_limit_reached",
  BAD_REQUEST: "bad_request",
  NOT_FOUND: "not_found",
  UPSTREAM_AI_ERROR: "upstream_ai_error",
  UPSTREAM_INVALID_OUTPUT: "upstream_invalid_output",
  ALLERGY_VIOLATION: "allergy_violation",
  INTERNAL: "internal_error",
  NETWORK: "network_error",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class ApiClientError extends Error {
  code: ErrorCode;
  status: number;
  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
  /** True when this error means "route the user to the paywall". */
  get isPaywall(): boolean {
    return this.code === ErrorCodes.GENERATION_LIMIT_REACHED || this.code === ErrorCodes.FORBIDDEN_NOT_PRO;
  }
}

// ---------------------------------------------------------------------------
// POST /detect-ingredients
// ---------------------------------------------------------------------------
export interface DetectIngredientsRequest {
  image_base64?: string;
  image_mime_type?: string;
  storage_path?: string;
}
export interface DetectIngredientsResponse {
  ingredients: string[];
}

// ---------------------------------------------------------------------------
// POST /generate-recipes
// ---------------------------------------------------------------------------
export interface GenerateRecipesRequest {
  ingredients: string[];
  n?: number;
  constraints?: {
    diet?: string;
    leftover_rescue?: boolean;
  };
}
export interface GeneratedRecipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  macros: Macros | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  tags: string[];
  image_url: string | null;
  image_status: "none" | "pending" | "ready" | "failed";
  created_at: string;
}
export interface GenerateRecipesResponse {
  recipes: GeneratedRecipe[];
  usage: { used: number; limit: number | null; remaining: number | null };
}

// ---------------------------------------------------------------------------
// POST /generate-dish-image (Pro-only, async) and POST /dish-image-status —
// contract per supabase/functions/README.md (verified live against the
// deployed function).
// ---------------------------------------------------------------------------
export interface GenerateDishImageRequest {
  recipe_id: string;
}
export interface GenerateDishImageResponse {
  image_status: "pending" | "ready" | "failed";
  image_url: string | null;
}
export type DishImageStatusRequest = GenerateDishImageRequest;
export type DishImageStatusResponse = GenerateDishImageResponse;

// ---------------------------------------------------------------------------
// POST /generate-meal-plan (Pro-only) — plan + missing-items shopping list.
// Shape per supabase/functions/README.md.
// ---------------------------------------------------------------------------
export interface GenerateMealPlanRequest {
  days?: number; // default 7, max 7
  meals_per_day?: number; // default 3, max 5
  macro_targets?: Partial<Macros>;
  pantry?: Array<{ name: string; quantity?: number | null; unit?: string | null; is_staple?: boolean }>;
  leftover_rescue?: boolean;
  week_start?: string; // ISO date, defaults to today
}
export interface GenerateMealPlanResponse {
  meal_plan: {
    id: string;
    week_start: string;
    days: Array<{
      day: number;
      meals: Array<{ slot: MealSlot; recipe: GeneratedRecipe }>;
      daily_macros: Macros;
    }>;
  };
  shopping_list: Array<{
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    checked: boolean;
    source_plan_id: string;
  }>;
}

// ---------------------------------------------------------------------------
// POST /adapt-recipe (Pro-only) — shape per supabase/functions/README.md.
// ---------------------------------------------------------------------------
export interface AdaptRecipeRequest {
  recipe_id?: string;
  url?: string;
  image_base64?: string;
  image_mime_type?: string;
  transformation: string; // e.g. "make it vegan", "half portions", "air fryer version"
}
export interface AdaptRecipeResponse {
  recipe: GeneratedRecipe;
}
