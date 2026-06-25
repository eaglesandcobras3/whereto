import { NextResponse } from "next/server";
import { onboardApiBlocked } from "@/lib/feature-flags";
import { userHasPortalActivity } from "@/lib/portal/portal-activity";
import { requirePortalUser } from "@/lib/portal/require-portal-user";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET() {
  const blocked = await onboardApiBlocked();
  if (blocked) return blocked;

  const session = await requirePortalUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const hasPortalActivity = await userHasPortalActivity(userId);

  const supabase = getServiceSupabase();
  const { data: memberships } = await supabase
    .from("business_members")
    .select("role")
    .eq("user_id", userId);

  const isOwner = (memberships ?? []).some((m) => (m.role as string) === "owner");

  return NextResponse.json({
    isOwner,
    hasPortalActivity,
    email: session.user.email ?? null,
  });
}
