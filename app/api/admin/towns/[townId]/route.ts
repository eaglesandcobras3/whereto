import { NextRequest, NextResponse } from "next/server";
import {
  adminTownPatchSchema,
  createAdminTown,
  getAdminTownById,
  updateAdminTown,
} from "@/lib/admin/admin-towns";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ townId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { townId } = await context.params;
  const supabase = getServiceSupabase();
  try {
    const town = await getAdminTownById(supabase, townId);
    if (!town) return NextResponse.json({ error: "Town not found" }, { status: 404 });
    return NextResponse.json({ town });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { townId } = await context.params;
  const body = await request.json();
  const parsed = adminTownPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    const town = await updateAdminTown(supabase, townId, parsed.data);
    return NextResponse.json({ town });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
