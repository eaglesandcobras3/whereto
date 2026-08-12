import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** List images for a rental property (intake / admin review). */
export async function GET(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const propertyId = request.nextUrl.searchParams.get("property_id")?.trim();
  if (!propertyId) {
    return NextResponse.json({ error: "property_id required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("rental_images")
    .select("id, storage_url, sort, alt")
    .eq("property_id", propertyId)
    .order("sort", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: property } = await supabase
    .from("rental_properties")
    .select("id, title, status, hero_image_url")
    .eq("id", propertyId)
    .maybeSingle();

  return NextResponse.json({
    property: property ?? null,
    images: data ?? [],
  });
}

const reviewSchema = z.object({
  property_id: z.string().uuid(),
  /** Image ids to keep. Any other images for the property are deleted. */
  include_image_ids: z.array(z.string().uuid()).max(40),
  /** Optional: set property status after applying photo choices (e.g. published). */
  status: z.enum(["draft", "pending_review", "published", "paused", "archived", "removed"]).optional(),
});

/**
 * Apply include/exclude photo review: keep selected images, delete the rest,
 * re-sort remaining, and sync hero_image_url to the first kept image.
 */
export async function PATCH(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid photo review" },
      { status: 400 },
    );
  }

  const { property_id, include_image_ids, status } = parsed.data;
  const supabase = getServiceSupabase();

  const { data: existing, error: listErr } = await supabase
    .from("rental_images")
    .select("id, storage_url, sort")
    .eq("property_id", property_id)
    .order("sort", { ascending: true });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const rows = (existing ?? []) as { id: string; storage_url: string; sort: number }[];
  const includeSet = new Set(include_image_ids);
  const keep = rows.filter((r) => includeSet.has(r.id));
  const dropIds = rows.filter((r) => !includeSet.has(r.id)).map((r) => r.id);

  if (dropIds.length > 0) {
    const { error: delErr } = await supabase.from("rental_images").delete().in("id", dropIds);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  for (let i = 0; i < keep.length; i++) {
    const { error: sortErr } = await supabase
      .from("rental_images")
      .update({ sort: i })
      .eq("id", keep[i].id);
    if (sortErr) return NextResponse.json({ error: sortErr.message }, { status: 500 });
  }

  const heroUrl = keep[0]?.storage_url ?? null;
  const propertyPatch: Record<string, unknown> = {
    hero_image_url: heroUrl,
    date_updated: new Date().toISOString(),
  };
  if (status) {
    propertyPatch.status = status;
    if (status === "published") {
      propertyPatch.published_at = new Date().toISOString();
    }
  }

  const { error: propErr } = await supabase
    .from("rental_properties")
    .update(propertyPatch)
    .eq("id", property_id);
  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    kept: keep.length,
    removed: dropIds.length,
    hero_image_url: heroUrl,
  });
}
