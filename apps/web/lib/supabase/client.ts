// Single Supabase browser client (singleton). Anon key only — RLS on every
// table is the trust boundary for direct table access (profiles, recipes,
// pantry_items, meal_plans, shopping_list_items, taste_events). Anything
// gated / metered / AI-backed goes through an Edge Function instead, see
// lib/api/client.ts — the client bundle never sees an AI provider key.
"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/db";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy them into apps/web/.env.local",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // PKCE + URL detection so the Google OAuth redirect back to the app
    // (…/?code=…) is automatically exchanged for a session on load.
    flowType: "pkce",
    detectSessionInUrl: true,
  },
});
