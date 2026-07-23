// Thin wrapper every function's serve() uses: handles CORS preflight and funnels any thrown
// error (ApiError or otherwise) through the consistent { error: { code, message } } envelope.

import { handleOptions } from "./cors.ts";
import { ApiError, ErrorCodes, errorResponse } from "./errors.ts";

export function withHandler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const preflight = handleOptions(req);
    if (preflight) return preflight;
    try {
      return await fn(req);
    } catch (e) {
      return errorResponse(req, e);
    }
  };
}

/** Parses the JSON body, throwing a clean bad_request ApiError on malformed input. */
export async function readJsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, ErrorCodes.BAD_REQUEST, "Request body must be valid JSON");
  }
}
