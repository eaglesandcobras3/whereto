import { NextRequest, NextResponse } from "next/server";
import type { AdminBusinessGetResponse } from "@/lib/admin/admin-business-get-response";
import {
  ADMIN_BUSINESS_SELECT,
  adminBusinessPatchSchema,
  buildAdminBusinessPatch,
  type AdminBusinessRow,
} from "@/lib/admin/admin-business-direct-edit";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { loadRelatedCategoriesByCategoryId } from "@/lib/categories/load-related-categories-by-id";
import { loadUnifiedCategoryOptions } from "@/lib/categories/load-unified-categories";
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
  const { getAllFeatureFlags, isMultipleCategoryFeatureEnabled } = await import(
    "@/lib/feature-flags"
  );
  const flags = await getAllFeatureFlags();
  const multipleCategory = isMultipleCategoryFeatureEnabled(flags);

  const [
    { data: business, error },
    { data: towns },
    { data: areas },
    { data: categories },
    membershipIds,
    relatedCategoriesByCategoryId,
    categoryGroups,
  ] = await Promise.all([
    supabase.from("businesses").select(ADMIN_BUSINESS_SELECT).eq("id", businessId).maybeSingle(),
    supabase.from("towns").select("id, title, slug").order("title", { ascending: true }),
    supabase.from("areas").select("id, title, slug, town_id").order("title", { ascending: true }),
    supabase
      .from("business_categories")
      .select("id, title, slug, parent_category_id")
      .is("archived_at", null)
      .order("title", { ascending: true }),
    (async () => {
      try {
        const { listMembershipCategoryIds } = await import(
          "@/lib/categories/business-category-memberships"
        );
        return await listMembershipCategoryIds(businessId, supabase);
      } catch {
        return [] as string[];
      }
    })(),
    loadRelatedCategoriesByCategoryId(supabase),
    loadUnifiedCategoryOptions(),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const leafCategories = (categories ?? []).filter((c) => c.parent_category_id != null);
  const categoryLeaves = categoryGroups.flatMap((g) =>
    g.leaves.map((l) => ({
      id: l.id,
      title: l.title,
      groupTitle: g.title,
    })),
  );

  return NextResponse.json({
    business: business as AdminBusinessRow,
    category_ids: membershipIds,
    multiple_category: multipleCategory,
    relatedCategoriesByCategoryId,
    options: {
      towns: towns ?? [],
      areas: areas ?? [],
      categories: leafCategories,
      categoryLeaves,
    },
  } satisfies AdminBusinessGetResponse);
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
  const membershipOnly =
    built == null &&
    (parsed.data.category_ids !== undefined || parsed.data.primary_category_id !== undefined);

  if (!built && !membershipOnly) {
    return NextResponse.json({ error: "No changes to save." }, { status: 400 });
  }

  // Always write the base table — never businesses_view.
  let updated = existing as AdminBusinessRow;
  let changes: string[] = [];
  if (built) {
    const { data, error: updateErr } = await supabase
      .from("businesses")
      .update(built.patch)
      .eq("id", businessId)
      .select(ADMIN_BUSINESS_SELECT)
      .single();

    if (updateErr || !data) {
      return NextResponse.json({ error: updateErr?.message ?? "Update failed" }, { status: 500 });
    }
    updated = data as AdminBusinessRow;
    changes = built.changes;
  }

  const { getAllFeatureFlags, isMultipleCategoryFeatureEnabled } = await import(
    "@/lib/feature-flags"
  );
  const { replaceMemberships, syncMembershipsToPrimary } = await import(
    "@/lib/categories/business-category-memberships"
  );
  const flags = await getAllFeatureFlags();
  const multipleCategory = isMultipleCategoryFeatureEnabled(flags);
  const nextPrimary =
    parsed.data.primary_category_id !== undefined
      ? parsed.data.primary_category_id
      : updated.primary_category_id;

  try {
    if (multipleCategory && parsed.data.category_ids !== undefined) {
      await replaceMemberships(
        businessId,
        { primaryId: nextPrimary, categoryIds: parsed.data.category_ids },
        supabase,
      );
      if (!changes.includes("category_ids")) changes.push("category_ids");
    } else if (parsed.data.primary_category_id !== undefined) {
      await syncMembershipsToPrimary(businessId, nextPrimary, supabase);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update category memberships" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    business: updated,
    changes,
  });
}
