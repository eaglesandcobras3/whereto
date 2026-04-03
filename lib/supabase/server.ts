import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv, getOptionalEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const env = getOptionalEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) getServerEnv();

  const cookieStore = await cookies();

  return createServerClient(url!, anon!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore in Server Components */
        }
      },
    },
  });
}
