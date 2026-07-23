// Consistent error envelope for every Edge Function: { error: { code, message } }.

import { corsHeaders } from "./cors.ts";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Well-known error codes used across functions (client routing depends on these).
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
} as const;

export function errorResponse(req: Request, err: unknown): Response {
  const apiErr =
    err instanceof ApiError
      ? err
      : new ApiError(500, ErrorCodes.INTERNAL, err instanceof Error ? err.message : String(err));

  if (!(err instanceof ApiError)) {
    // Unexpected errors: log server-side for debugging, never leak internals to the client.
    console.error("Unhandled error:", err);
  }

  return jsonResponse(
    req,
    { error: { code: apiErr.code, message: apiErr.message } },
    apiErr.status,
  );
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(req),
    },
  });
}
