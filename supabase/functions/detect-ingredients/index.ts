// POST /detect-ingredients — image (base64 or storage path) in, ingredient name list out.
// NOT metered, NOT gated — any authenticated user can call this.

import { withHandler, readJsonBody } from "../_shared/handler.ts";
import { jsonResponse } from "../_shared/errors.ts";
import { ApiError, ErrorCodes } from "../_shared/errors.ts";
import { requireUser, getAdminClient } from "../_shared/supabaseAdmin.ts";
import { callFalVision, MODELS } from "../_shared/fal.ts";
import { parseWithRetry, type ValidationResult } from "../_shared/jsonRetry.ts";

interface DetectIngredientsRequest {
  image_base64?: string; // raw base64 or a full data: URI
  image_mime_type?: string; // e.g. "image/jpeg" — required if image_base64 is raw (not a data URI)
  storage_path?: string; // path within the `fridge-photos` bucket, e.g. "<user_id>/photo123.jpg"
}

interface DetectIngredientsResponse {
  ingredients: string[];
}

const SYSTEM_PROMPT =
  "You are Sousbot's ingredient detector. Respond ONLY with a raw JSON array of lowercase, " +
  "singular food-ingredient name strings visible in the photo (e.g. \"tomato\" not \"Tomatoes\"). " +
  "No brand names, no packaging descriptions, no non-food items, no markdown fences, no commentary.";

const USER_PROMPT =
  "List every distinct food ingredient visible in this photo. If uncertain about an item, " +
  "include your best guess rather than omitting it.";

function validateIngredientArray(v: unknown): ValidationResult<string[]> {
  if (!Array.isArray(v)) return { ok: false, errors: ["response is not a JSON array"] };
  const errors: string[] = [];
  const cleaned: string[] = [];
  v.forEach((item, i) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      errors.push(`element[${i}] is not a non-empty string`);
    } else {
      cleaned.push(item.trim().toLowerCase());
    }
  });
  if (cleaned.length === 0) return { ok: false, errors: errors.length ? errors : ["no ingredients found"] };
  // De-duplicate while preserving order.
  return { ok: true, value: [...new Set(cleaned)] };
}

async function resolveImageUrl(req: DetectIngredientsRequest, userId: string): Promise<string> {
  if (req.storage_path) {
    // Enforce the caller can only ever read their own uploaded photos.
    const normalizedPath = req.storage_path.replace(/^\/+/, "");
    if (!normalizedPath.startsWith(`${userId}/`)) {
      throw new ApiError(403, ErrorCodes.FORBIDDEN, "storage_path must be within your own folder");
    }
    const admin = getAdminClient();
    const { data, error } = await admin.storage
      .from("fridge-photos")
      .createSignedUrl(normalizedPath, 300); // 5 minutes, plenty for a single vision call
    if (error || !data?.signedUrl) {
      throw new ApiError(404, ErrorCodes.NOT_FOUND, `Could not resolve storage_path: ${error?.message ?? "not found"}`);
    }
    return data.signedUrl;
  }

  if (req.image_base64) {
    if (req.image_base64.startsWith("data:")) return req.image_base64;
    const mime = req.image_mime_type ?? "image/jpeg";
    return `data:${mime};base64,${req.image_base64}`;
  }

  throw new ApiError(400, ErrorCodes.BAD_REQUEST, "Provide either image_base64 or storage_path");
}

Deno.serve(
  withHandler(async (req) => {
    if (req.method !== "POST") {
      throw new ApiError(405, ErrorCodes.BAD_REQUEST, "Use POST");
    }

    const { userId } = await requireUser(req);
    const body = await readJsonBody<DetectIngredientsRequest>(req);
    const imageUrl = await resolveImageUrl(body, userId);

    const outcome = await parseWithRetry({
      attempts: [
        () =>
          callFalVision({
            model: MODELS.vision,
            image_urls: [imageUrl],
            system_prompt: SYSTEM_PROMPT,
            prompt: USER_PROMPT,
            temperature: 0.2,
            max_tokens: 400,
          }).then((r) => r.output),
        () =>
          callFalVision({
            model: MODELS.vision,
            image_urls: [imageUrl],
            system_prompt:
              SYSTEM_PROMPT +
              " Your previous response was not valid JSON matching the schema. Return ONLY the corrected raw JSON array.",
            prompt: USER_PROMPT,
            temperature: 0,
            max_tokens: 400,
          }).then((r) => r.output),
        () =>
          callFalVision({
            model: MODELS.visionFallback,
            image_urls: [imageUrl],
            system_prompt: SYSTEM_PROMPT,
            prompt: USER_PROMPT,
            temperature: 0,
            max_tokens: 400,
          }).then((r) => r.output),
      ],
      validate: validateIngredientArray,
    });

    const responseBody: DetectIngredientsResponse = { ingredients: outcome.value };
    return jsonResponse(req, responseBody, 200);
  }),
);
