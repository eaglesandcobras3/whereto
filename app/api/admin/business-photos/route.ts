import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { businessListingImagePatch } from "@/lib/business/listing-image-patch";
import { businessPhotosApiBlocked } from "@/lib/feature-flags";
import { uploadPortalImage } from "@/lib/portal/storage-upload";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const photosBlocked = await businessPhotosApiBlocked();
  if (photosBlocked) return photosBlocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const businessId = request.nextUrl.searchParams.get("business_id")?.trim();
  const status = request.nextUrl.searchParams.get("status")?.trim() || "pending";
  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  let query = supabase
    .from("business_photos")
    .select("id, public_url, is_hero, status, sort_order, created_at")
    .eq("business_id", businessId)
    .order("is_hero", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ photos: data ?? [] });
}

/**
 * Admin gallery upload: resize → WebP → insert as approved (no review queue).
 * Optionally set as main listing image on `businesses` URL columns.
 */
export async function POST(request: NextRequest) {
  const photosBlocked = await businessPhotosApiBlocked();
  if (photosBlocked) return photosBlocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const businessId = String(formData.get("business_id") ?? "").trim();
  const file = formData.get("file");
  const isHero = String(formData.get("is_hero") ?? "") === "true";

  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  let uploaded: { publicUrl: string; storagePath: string };
  try {
    uploaded = await uploadPortalImage(supabase, file, `admin/businesses/${businessId}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (isHero) {
    await supabase
      .from("business_photos")
      .update({ is_hero: false })
      .eq("business_id", businessId);
    const patch = businessListingImagePatch(uploaded.publicUrl);
    if (patch) {
      const { error: bizErr } = await supabase.from("businesses").update(patch).eq("id", businessId);
      if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });
    }
  }

  const { data: photo, error: photoErr } = await supabase
    .from("business_photos")
    .insert({
      business_id: businessId,
      uploaded_by: admin.userId,
      public_url: uploaded.publicUrl,
      storage_path: uploaded.storagePath,
      status: "approved",
      is_hero: isHero,
    })
    .select("id, public_url, is_hero, status, sort_order, created_at")
    .single();

  if (photoErr || !photo) {
    return NextResponse.json({ error: photoErr?.message ?? "Could not save photo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, photo });
}

const patchSchema = z.object({
  business_id: z.string().uuid(),
  include_photo_ids: z.array(z.string().uuid()).max(48),
  pending_photo_ids: z.array(z.string().uuid()).max(48),
});

/**
 * Include selected pending photos (approve) and exclude the rest (reject).
 */
export async function PATCH(request: NextRequest) {
  const photosBlocked = await businessPhotosApiBlocked();
  if (photosBlocked) return photosBlocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid photo review" },
      { status: 400 },
    );
  }

  const { business_id, include_photo_ids, pending_photo_ids } = parsed.data;
  const includeSet = new Set(include_photo_ids);
  const supabase = getServiceSupabase();

  const { data: rows, error: listErr } = await supabase
    .from("business_photos")
    .select("id, public_url, is_hero, status")
    .eq("business_id", business_id)
    .in("id", pending_photo_ids);
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const photos = (rows ?? []) as {
    id: string;
    public_url: string;
    is_hero: boolean;
    status: string;
  }[];

  for (const photo of photos) {
    if (includeSet.has(photo.id)) {
      const { error } = await supabase
        .from("business_photos")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", photo.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      if (photo.is_hero && photo.public_url) {
        await supabase
          .from("business_photos")
          .update({ is_hero: false })
          .eq("business_id", business_id)
          .neq("id", photo.id);
        const patch = businessListingImagePatch(photo.public_url);
        if (patch) {
          await supabase.from("businesses").update(patch).eq("id", business_id);
        }
      }
    } else {
      const { error } = await supabase
        .from("business_photos")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", photo.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    included: include_photo_ids.length,
    excluded: pending_photo_ids.filter((id) => !includeSet.has(id)).length,
  });
}

const deleteSchema = z.object({
  business_id: z.string().uuid(),
  photo_id: z.string().uuid(),
});

/** Soft-remove an approved gallery photo (mark rejected). */
export async function DELETE(request: NextRequest) {
  const photosBlocked = await businessPhotosApiBlocked();
  if (photosBlocked) return photosBlocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "business_id and photo_id required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("business_photos")
    .update({ status: "rejected", is_hero: false, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.photo_id)
    .eq("business_id", parsed.data.business_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
