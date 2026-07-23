// Single typed client for every Supabase Edge Function. Never calls fal.ai
// (or any AI provider) directly — every request goes to
// `${SUPABASE_URL}/functions/v1/<fn>` with the user's own JWT, matching the
// PRD's "clients never call AI providers directly" acceptance criterion.
"use client";

import { supabase } from "../supabase/client";
import {
  ApiClientError,
  ErrorCodes,
  type AdaptRecipeRequest,
  type AdaptRecipeResponse,
  type DetectIngredientsRequest,
  type DetectIngredientsResponse,
  type DishImageStatusRequest,
  type DishImageStatusResponse,
  type GenerateDishImageRequest,
  type GenerateDishImageResponse,
  type GenerateMealPlanRequest,
  type GenerateMealPlanResponse,
  type GenerateRecipesRequest,
  type GenerateRecipesResponse,
} from "./types";

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL;

if (!FUNCTIONS_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL in apps/web/.env.local");
}

async function callFunction<TReq, TRes>(name: string, body: TReq): Promise<TRes> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new ApiClientError(401, ErrorCodes.UNAUTHORIZED, "No active session. Sign in first.");
  }

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiClientError(
      0,
      ErrorCodes.NETWORK,
      err instanceof Error ? err.message : "Network request failed",
    );
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON body (e.g. the function isn't deployed yet — Supabase returns
    // a plain-text 404). Fall through to the generic error below.
  }

  if (!res.ok) {
    const errObj = (json as { error?: { code?: string; message?: string } } | null)?.error;
    if (errObj?.code) {
      throw new ApiClientError(res.status, errObj.code as never, errObj.message ?? "Request failed");
    }
    if (res.status === 404) {
      throw new ApiClientError(
        404,
        ErrorCodes.NOT_FOUND,
        `Edge Function "${name}" is not deployed yet.`,
      );
    }
    throw new ApiClientError(res.status, ErrorCodes.INTERNAL, `Request to ${name} failed (${res.status})`);
  }

  return json as TRes;
}

export const api = {
  detectIngredients: (req: DetectIngredientsRequest) =>
    callFunction<DetectIngredientsRequest, DetectIngredientsResponse>("detect-ingredients", req),

  generateRecipes: (req: GenerateRecipesRequest) =>
    callFunction<GenerateRecipesRequest, GenerateRecipesResponse>("generate-recipes", req),

  generateDishImage: (req: GenerateDishImageRequest) =>
    callFunction<GenerateDishImageRequest, GenerateDishImageResponse>("generate-dish-image", req),

  dishImageStatus: (req: DishImageStatusRequest) =>
    callFunction<DishImageStatusRequest, DishImageStatusResponse>("dish-image-status", req),

  generateMealPlan: (req: GenerateMealPlanRequest) =>
    callFunction<GenerateMealPlanRequest, GenerateMealPlanResponse>("generate-meal-plan", req),

  adaptRecipe: (req: AdaptRecipeRequest) =>
    callFunction<AdaptRecipeRequest, AdaptRecipeResponse>("adapt-recipe", req),
};

export { ApiClientError, ErrorCodes };
