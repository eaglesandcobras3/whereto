import "server-only";

import { cache } from "react";

import { getSupabasePublishableKey } from "@/lib/supabase/env-keys";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthSessionUser } from "./types";

/** Deduped per-request session read for layout chrome and analytics. */
export const getSessionUser = cache(async (): Promise<AuthSessionUser | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable = getSupabasePublishableKey();
  if (!url || !publishable) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
  };
});
