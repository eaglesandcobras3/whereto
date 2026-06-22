import { NextResponse } from "next/server";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET() {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data: memberships } = await supabase
    .from("business_members")
    .select("role")
    .eq("user_id", session.user.id);

  const isOwner = (memberships ?? []).some((m) => (m.role as string) === "owner");

  return NextResponse.json({
    isOwner,
    email: session.user.email ?? null,
  });
}
