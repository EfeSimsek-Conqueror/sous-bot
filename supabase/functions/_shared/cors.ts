// CORS headers shared by every Edge Function so the Next.js web app (and any other
// browser-based client) can call these endpoints cross-origin.
//
// We reflect a small allowlist rather than "*" because requests carry an Authorization
// header (credentialed), and browsers disallow "*" alongside credentialed requests in
// some configurations; reflecting an explicit origin is the safe, portable choice.

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://sousbot.app",
  "https://www.sousbot.app",
];

function allowedOrigins(): string[] {
  const extra = Deno.env.get("CORS_EXTRA_ORIGINS");
  if (!extra) return DEFAULT_ALLOWED_ORIGINS;
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra.split(",").map((s) => s.trim()).filter(Boolean)];
}

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

/** Handle the CORS preflight. Call this first in every function's serve() handler. */
export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}
