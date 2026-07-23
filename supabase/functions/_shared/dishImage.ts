// Shared logic for async dish-image generation, used by both generate-dish-image (submits a
// new job or reports current state) and dish-image-status (poll-only, never submits). Per the
// PRD this is async: submit to the fal queue, return immediately, poll/complete idempotently
// and upload the final image into the `dish-images` storage bucket.

// deno-lint-ignore no-explicit-any
type AdminClient = any;

import { ApiError, ErrorCodes } from "./errors.ts";
import { submitDishImage, getDishImageStatus, getDishImageResult } from "./fal.ts";

export interface RecipeImageRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  difficulty: string | null;
  image_url: string | null;
  image_status: "none" | "pending" | "ready" | "failed";
  image_request_id: string | null;
  image_status_url: string | null;
  image_response_url: string | null;
}

const RECIPE_IMAGE_COLUMNS =
  "id, user_id, title, description, tags, difficulty, image_url, image_status, image_request_id, image_status_url, image_response_url";

export async function loadOwnedRecipe(
  admin: AdminClient,
  recipeId: string,
  userId: string,
): Promise<RecipeImageRow> {
  const { data, error } = await admin
    .from("recipes")
    .select(RECIPE_IMAGE_COLUMNS)
    .eq("id", recipeId)
    .maybeSingle();

  if (error) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to load recipe: ${error.message}`);
  if (!data) throw new ApiError(404, ErrorCodes.NOT_FOUND, "Recipe not found");
  if (data.user_id !== userId) throw new ApiError(403, ErrorCodes.FORBIDDEN, "Not your recipe");
  return data as RecipeImageRow;
}

export function buildDishImagePrompt(recipe: Pick<RecipeImageRow, "title" | "description" | "tags" | "difficulty">): string {
  const tags = recipe.tags ?? [];
  const isFineDining = recipe.difficulty === "hard" || tags.some((t) => /fine|gourmet|elegant|plated/i.test(t));
  const plateStyle = isFineDining ? "dark slate plate" : "rustic white ceramic plate";
  const isTextureHeavy = tags.some((t) => /steak|pastry|dessert|cake|bread/i.test(t));
  const stylePrefix = isTextureHeavy
    ? "Close-up 45-degree food-photography shot of"
    : "Overhead food-photography shot of";
  const shortDescription = (recipe.description ?? recipe.title).slice(0, 220);

  return `${stylePrefix} photo of ${recipe.title}: ${shortDescription}, served on ${plateStyle}, ` +
    "garnished with fresh herbs, natural window light, shallow depth of field, appetising, " +
    "high detail, restaurant quality food photography, no text, no watermark, no hands, no utensils in motion";
}

/** Submits a brand-new fal queue job for this recipe and marks it pending. Returns the updated row. */
export async function submitNewImageJob(admin: AdminClient, recipe: RecipeImageRow): Promise<RecipeImageRow> {
  const prompt = buildDishImagePrompt(recipe);
  const submitted = await submitDishImage({
    prompt,
    aspect_ratio: "4:3",
    output_format: "jpeg",
    safety_tolerance: "2",
  });

  const { data, error } = await admin
    .from("recipes")
    .update({
      image_status: "pending",
      image_request_id: submitted.request_id,
      image_status_url: submitted.status_url,
      image_response_url: submitted.response_url,
    })
    .eq("id", recipe.id)
    .select(RECIPE_IMAGE_COLUMNS)
    .single();

  if (error) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to persist image job: ${error.message}`);
  return data as RecipeImageRow;
}

/**
 * Checks the fal queue status ONCE (non-blocking — no internal sleep loop, safe to call from a
 * request/response cycle) and, if completed, downloads the image and uploads it into the
 * `dish-images` bucket, writing image_url + image_status='ready'. Idempotent on request_id: if
 * called again after already-ready, the caller should short-circuit before invoking this (see
 * loadOwnedRecipe + the `already ready` early-return in each function's handler).
 */
export async function pollAndMaybeComplete(admin: AdminClient, recipe: RecipeImageRow): Promise<RecipeImageRow> {
  if (recipe.image_status !== "pending" || !recipe.image_status_url || !recipe.image_response_url) {
    return recipe;
  }

  let status;
  try {
    status = await getDishImageStatus(recipe.image_status_url);
  } catch (e) {
    console.error(`fal status check failed for recipe ${recipe.id}:`, e);
    return recipe; // transient — leave as pending, client will poll again
  }

  if (status.status !== "COMPLETED") {
    return recipe;
  }

  const result = await getDishImageResult(recipe.image_response_url);
  const image = result.images?.[0];
  if (!image?.url) {
    const { data, error } = await admin
      .from("recipes")
      .update({ image_status: "failed" })
      .eq("id", recipe.id)
      .select(RECIPE_IMAGE_COLUMNS)
      .single();
    if (error) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to mark image failed: ${error.message}`);
    return data as RecipeImageRow;
  }

  const imageRes = await fetch(image.url);
  if (!imageRes.ok) {
    throw new ApiError(502, ErrorCodes.UPSTREAM_AI_ERROR, `Failed to download generated image: ${imageRes.status}`);
  }
  const bytes = new Uint8Array(await imageRes.arrayBuffer());
  const ext = image.content_type?.includes("png") ? "png" : "jpg";
  const storagePath = `${recipe.user_id}/${recipe.id}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("dish-images")
    .upload(storagePath, bytes, { contentType: image.content_type ?? "image/jpeg", upsert: true });
  if (uploadError) {
    throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to upload dish image: ${uploadError.message}`);
  }

  const { data: publicUrlData } = admin.storage.from("dish-images").getPublicUrl(storagePath);

  const { data, error } = await admin
    .from("recipes")
    .update({ image_status: "ready", image_url: publicUrlData.publicUrl })
    .eq("id", recipe.id)
    .select(RECIPE_IMAGE_COLUMNS)
    .single();
  if (error) throw new ApiError(500, ErrorCodes.INTERNAL, `Failed to finalize image: ${error.message}`);
  return data as RecipeImageRow;
}
