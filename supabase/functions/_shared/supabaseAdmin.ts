// Supabase admin (service_role) client factory + JWT verification helper.
//
// Every gated/data-writing Edge Function uses the service_role client (bypasses RLS by
// design — the function itself is the trust boundary) but MUST derive user_id from the
// caller's verified JWT, never from a client-supplied field in the request body.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { ApiError, ErrorCodes } from "./errors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** service_role client — bypasses RLS. Use for all DB writes/reads inside Edge Functions. */
export function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verifies the caller's JWT (from the Authorization: Bearer <token> header) against
 * Supabase Auth and returns the authenticated user's id. Throws ApiError(401) if the
 * header is missing/malformed or the token doesn't verify.
 *
 * This is the ONLY source of truth for "who is calling" — request bodies must never
 * carry a user_id field that's trusted for authorization purposes.
 */
export async function requireUser(req: Request): Promise<{ userId: string; jwt: string }> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, "Missing or malformed Authorization header");
  }
  const jwt = authHeader.slice(7).trim();
  if (!jwt) {
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, "Missing bearer token");
  }

  // Use the anon-key client to validate the JWT via the Auth server (getUser verifies
  // the token signature/expiry server-side rather than just decoding it locally).
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(jwt);
  if (error || !data?.user) {
    throw new ApiError(401, ErrorCodes.UNAUTHORIZED, "Invalid or expired token");
  }
  return { userId: data.user.id, jwt };
}
