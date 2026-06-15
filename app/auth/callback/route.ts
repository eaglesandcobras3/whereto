import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublishableKey } from "@/lib/supabase/env-keys";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (code) {
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishable = getSupabasePublishableKey();
    if (url && publishable) {
      const supabase = createServerClient(url, publishable, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      });
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
