import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function requireBusinessMember(
  businessId: string,
): Promise<{ userId: string; role: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = getServiceSupabase();
  const { data } = await svc
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { userId: user.id, role: data.role as string };
}
