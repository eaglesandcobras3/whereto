import { NextRequest, NextResponse } from "next/server";
import { communityTipsApiBlocked } from "@/lib/feature-flags";
import { searchCommunityTipEntities } from "@/lib/community-tips/search-entities";
import { COMMUNITY_TIP_ENTITY_TYPES } from "@/lib/community-tips/schema";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  const blocked = await communityTipsApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entityType = request.nextUrl.searchParams.get("entity_type") ?? "";
  if (!COMMUNITY_TIP_ENTITY_TYPES.includes(entityType as (typeof COMMUNITY_TIP_ENTITY_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = getServiceSupabase();
  try {
    const results = await searchCommunityTipEntities(
      supabase,
      entityType as (typeof COMMUNITY_TIP_ENTITY_TYPES)[number],
      q,
    );
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
