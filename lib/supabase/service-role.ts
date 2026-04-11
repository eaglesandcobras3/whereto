import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseSecretKey } from "./env-keys";

let cached: SupabaseClient | null = null;

/**
 * Use when the DB may be unavailable (e.g. `next build` without env).
 * Runtime routes should prefer `getServiceSupabase()` and fail loudly if misconfigured.
 */
export function getServiceSupabaseOrNull(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseSecretKey();
  if (!url || !key) return null;
  return getServiceSupabase();
}

/** Server-only client with RLS bypass. Do not import from client components. */
export function getServiceSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (legacy: SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
