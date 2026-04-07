/**
 * Prefer Supabase publishable + secret keys (`sb_publishable_…`, `sb_secret_…`).
 * Falls back to legacy JWT anon / service_role env names until they are removed.
 */

export function getSupabasePublishableKey(): string | undefined {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return k || undefined;
}

export function getSupabaseSecretKey(): string | undefined {
  const k =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return k || undefined;
}
