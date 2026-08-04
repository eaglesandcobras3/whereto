import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminUser = {
  userId: string;
  email: string | null;
  name: string | null;
};

export async function requireAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name.trim()
        : null;

  const asAdmin = (): AdminUser => ({
    userId: user.id,
    email: user.email ?? null,
    name: metaName || (user.email ? user.email.split("@")[0] : null),
  });

  if (adminIds.includes(user.id)) return asAdmin();
  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return asAdmin();
  }
  return null;
}
