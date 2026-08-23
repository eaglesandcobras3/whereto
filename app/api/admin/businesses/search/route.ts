import { NextRequest, NextResponse } from "next/server";
import { searchBusinessesForAdminEdit } from "@/lib/admin/search-businesses-for-edit";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** Admin business picker search (title or slug). */
export async function GET(request: NextRequest) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 12;

  const supabase = getServiceSupabase();
  try {
    const hits = await searchBusinessesForAdminEdit(supabase, q, limit);
    return NextResponse.json({ results: hits });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
