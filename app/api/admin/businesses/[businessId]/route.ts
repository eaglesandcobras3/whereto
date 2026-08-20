import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_BUSINESS_SELECT,
  adminBusinessPatchSchema,
  buildAdminBusinessPatch,
  type AdminBusinessRow,
} from "@/lib/admin/admin-business-direct-edit";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ businessId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { businessId } = await context.params;
  const supabase = getServiceSupabase();

  const [{ data: business, error }, { data: towns }, { data: areas }, { data: categories }] =
    await Promise.all([
      supabase.from("businesses").select(ADMIN_BUSINESS_SELECT).eq("id", businessId).maybeSingle(),
      supabase.from("towns").select("id, title, slug").order("title", { ascending: true }),
      supabase.from("areas").select("id, title, slug, town_id").order("title", { ascending: true }),
      supabase
        .from("business_categories")
        .select("id, title, slug, parent_category_id")
        .is("archived_at", null)
        .order("title", { ascending: true }),
    ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const leafCategories = (categories ?? []).filter((c) => c.parent_category_id != null);

  return NextResponse.json({
    business: business as AdminBusinessRow,
    options: {
      towns: towns ?? [],
      areas: areas ?? [],
      categories: leafCategories,
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { businessId } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = adminBusinessPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();
  const { data: existing, error: loadErr } = await supabase
    .from("businesses")
    .select(ADMIN_BUSINESS_SELECT)
    .eq("id", businessId)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  let takenSlugs: Set<string> | undefined;
  if (parsed.data.regenerate_slug === true) {
    const { data: slugRows } = await supabase.from("businesses").select("slug");
    takenSlugs = new Set((slugRows ?? []).map((r) => String((r as { slug: string }).slug)));
  }

  const built = buildAdminBusinessPatch(existing as AdminBusinessRow, parsed.data, { takenSlugs });
  if (!built) {
    return NextResponse.json({ error: "No changes to save." }, { status: 400 });
  }

  // Always write the base table — never businesses_view.
  const { data: updated, error: updateErr } = await supabase
    .from("businesses")
    .update(built.patch)
    .eq("id", businessId)
    .select(ADMIN_BUSINESS_SELECT)
    .single();

  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    business: updated as AdminBusinessRow,
    changes: built.changes,
  });
}
