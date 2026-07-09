"use server";

import { revalidatePath } from "next/cache";

import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthActionResult } from "./types";

export async function signInWithPasswordAction(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Could not sign in" };

  revalidatePath("/", "layout");

  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  };
}

export async function signUpAction(email: string, password: string): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");

  if (data.user) {
    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    };
  }

  return { ok: true };
}

export async function requestPasswordResetAction(email: string): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const siteUrl = getSiteUrl();
  const nextPath = encodeURIComponent("/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=${nextPath}`,
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function updatePasswordAction(password: string): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");

  return { ok: true };
}
