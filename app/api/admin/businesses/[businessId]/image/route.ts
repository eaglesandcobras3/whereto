import { NextRequest, NextResponse } from "next/server";
import { businessListingImagePatch } from "@/lib/business/listing-image-patch";
import { businessPhotosApiBlocked } from "@/lib/feature-flags";
import { uploadPortalImage } from "@/lib/portal/storage-upload";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ businessId: string }> };

/**
 * Admin: set or clear the main listing image on `public.businesses`
 * (`main_image_url` / `hero_image_url` — never write via businesses_view).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await businessPhotosApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { businessId } = await context.params;
  const supabase = getServiceSupabase();

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, title")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const contentType = request.headers.get("content-type") ?? "";
  let imageUrl: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const clear = String(formData.get("clear") ?? "") === "true";
    if (clear) {
      imageUrl = null;
    } else {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file." }, { status: 400 });
      }
      try {
        const uploaded = await uploadPortalImage(supabase, file, `admin/businesses/${businessId}`);
        imageUrl = uploaded.publicUrl;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
  } else {
    const body = (await request.json().catch(() => null)) as {
      image_url?: string | null;
      clear?: boolean;
    } | null;
    if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    if (body.clear) {
      imageUrl = null;
    } else if (typeof body.image_url === "string" && body.image_url.trim()) {
      imageUrl = body.image_url.trim();
    } else {
      return NextResponse.json({ error: "Provide image_url or clear." }, { status: 400 });
    }
  }

  const patch = businessListingImagePatch(imageUrl);
  const { error } = await supabase.from("businesses").update(patch!).eq("id", businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (imageUrl) {
    await supabase
      .from("business_photos")
      .update({ is_hero: false })
      .eq("business_id", businessId);

    await supabase.from("business_photos").insert({
      business_id: businessId,
      uploaded_by: admin.userId,
      public_url: imageUrl,
      storage_path: null,
      status: "approved",
      is_hero: true,
    });
  }

  return NextResponse.json({
    ok: true,
    business_id: businessId,
    main_image_url: imageUrl,
    hero_image_url: imageUrl,
  });
}
