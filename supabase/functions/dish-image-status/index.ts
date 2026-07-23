// GET/POST /dish-image-status — recipe id in, current image status/url out. Poll-only: never
// submits a new fal job (that's generate-dish-image's job), just checks/advances an in-flight
// one. Pro-gated for consistency (a free user has no image job to poll anyway).

import { withHandler, readJsonBody } from "../_shared/handler.ts";
import { ApiError, ErrorCodes, jsonResponse } from "../_shared/errors.ts";
import { requireUser, getAdminClient } from "../_shared/supabaseAdmin.ts";
import { requirePro } from "../_shared/entitlements.ts";
import { loadOwnedRecipe, pollAndMaybeComplete } from "../_shared/dishImage.ts";

interface DishImageStatusRequest {
  recipe_id: string;
}

Deno.serve(
  withHandler(async (req) => {
    const { userId } = await requireUser(req);

    let recipeId: string | null = null;
    if (req.method === "GET") {
      recipeId = new URL(req.url).searchParams.get("recipe_id");
    } else if (req.method === "POST") {
      const body = await readJsonBody<DishImageStatusRequest>(req);
      recipeId = body.recipe_id;
    } else {
      throw new ApiError(405, ErrorCodes.BAD_REQUEST, "Use GET or POST");
    }
    if (!recipeId) throw new ApiError(400, ErrorCodes.BAD_REQUEST, "recipe_id is required");

    const admin = getAdminClient();
    await requirePro(admin, userId);

    let recipe = await loadOwnedRecipe(admin, recipeId, userId);
    if (recipe.image_status === "pending") {
      recipe = await pollAndMaybeComplete(admin, recipe);
    }

    return jsonResponse(req, { image_status: recipe.image_status, image_url: recipe.image_url }, 200);
  }),
);
