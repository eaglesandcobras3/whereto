import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** Returns the signed-in user when they own at least one business listing. */
export async function requireAnyBusinessOwner(): Promise<{ userId: string } | null> {
  const session = await requirePortalUser();
  if (!session) return null;

  const supabase = getServiceSupabase();
  const { data: memberships } = await supabase
    .from("business_members")
    .select("user_id")
    .eq("user_id", session.user.id)
    .eq("role", "owner")
    .limit(1);

  if (!memberships?.length) return null;
  return { userId: session.user.id };
}
