import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User;
};

/** Next.js sends the intended URL on App Router requests (RSC, actions, pages). */
async function adminLoginNextPath(): Promise<string> {
  const h = await headers();
  const raw = h.get("next-url");
  if (!raw) return "/admin";
  try {
    const pathname = new URL(raw, "https://placeholder.local").pathname;
    if (pathname.startsWith("/admin")) return pathname;
  } catch {
    /* ignore */
  }
  return "/admin";
}

export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const nextPath = await adminLoginNextPath();
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    redirect("/");
  }
  return { supabase, user };
}
