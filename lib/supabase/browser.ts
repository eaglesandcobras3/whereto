import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublishableKey } from "./env-keys";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = getSupabasePublishableKey();
  if (!url || !publishable) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (legacy: NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }
  return createBrowserClient(url, publishable);
}
