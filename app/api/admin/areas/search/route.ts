import { NextRequest, NextResponse } from "next/server";
import { searchAreasForAdmin } from "@/lib/admin/admin-areas";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const townId = request.nextUrl.searchParams.get("townId")?.trim() || null;
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

  const supabase = getServiceSupabase();
  try {
    const results = await searchAreasForAdmin(supabase, q, limit, townId);
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
