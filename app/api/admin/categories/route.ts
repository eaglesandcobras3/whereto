import { NextRequest, NextResponse } from "next/server";
import { listAdminCategories } from "@/lib/admin/admin-categories";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = getServiceSupabase();
  try {
    const categories = await listAdminCategories(supabase, q || undefined);
    return NextResponse.json({ categories });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
