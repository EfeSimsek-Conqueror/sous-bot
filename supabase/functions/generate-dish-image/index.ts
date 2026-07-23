// POST /generate-dish-image — recipe id in, image url out. PRO-GATED, server-enforced: a free
// user must never get an image even if the client asks. Async per PRD: submits to the fal
// queue and returns immediately with image_status='pending'; call again (or poll
// /dish-image-status) to advance/complete the job — idempotent either way.

import { withHandler, readJsonBody } from "../_shared/handler.ts";
import { ApiError, ErrorCodes, jsonResponse } from "../_shared/errors.ts";
import { requireUser, getAdminClient } from "../_shared/supabaseAdmin.ts";
import { requirePro } from "../_shared/entitlements.ts";
import { loadOwnedRecipe, submitNewImageJob, pollAndMaybeComplete } from "../_shared/dishImage.ts";

interface GenerateDishImageRequest {
  recipe_id: string;
}

Deno.serve(
  withHandler(async (req) => {
    if (req.method !== "POST") throw new ApiError(405, ErrorCodes.BAD_REQUEST, "Use POST");

    const { userId } = await requireUser(req);
    const body = await readJsonBody<GenerateDishImageRequest>(req);
    if (!body.recipe_id || typeof body.recipe_id !== "string") {
      throw new ApiError(400, ErrorCodes.BAD_REQUEST, "recipe_id is required");
    }

    const admin = getAdminClient();

    // Server-enforced Pro gate — checked BEFORE anything else touches fal or storage, so a
    // free user calling this directly (bypassing the client UI) is refused regardless.
    await requirePro(admin, userId);

    let recipe = await loadOwnedRecipe(admin, body.recipe_id, userId);

    if (recipe.image_status === "ready") {
      return jsonResponse(req, { image_status: "ready", image_url: recipe.image_url }, 200);
    }

    if (recipe.image_status === "pending" && recipe.image_status_url) {
      recipe = await pollAndMaybeComplete(admin, recipe);
      return jsonResponse(
        req,
        { image_status: recipe.image_status, image_url: recipe.image_url },
        recipe.image_status === "ready" ? 200 : 202,
      );
    }

    // 'none' or 'failed' (retry) → submit a fresh job.
    recipe = await submitNewImageJob(admin, recipe);
    return jsonResponse(req, { image_status: recipe.image_status, image_url: recipe.image_url }, 202);
  }),
);
