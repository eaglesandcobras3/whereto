import { NextRequest, NextResponse } from "next/server";
import {
  adminAreaPatchSchema,
  getAdminAreaById,
  updateAdminArea,
} from "@/lib/admin/admin-areas";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ areaId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { areaId } = await context.params;
  const supabase = getServiceSupabase();
  const [area, { data: towns }] = await Promise.all([
    getAdminAreaById(supabase, areaId),
    supabase.from("towns").select("id, title, slug").is("archived_at", null).order("title"),
  ]);

  if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 });

  return NextResponse.json({ area, options: { towns: towns ?? [] } });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { areaId } = await context.params;
  const body = await request.json();
  const parsed = adminAreaPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const area = await updateAdminArea(supabase, areaId, parsed.data);
    return NextResponse.json({ area });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
