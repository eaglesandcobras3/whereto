import { NextRequest, NextResponse } from "next/server";
import { adminBusinessDirectEditApiBlocked } from "@/lib/feature-flags";
import { businessListingImagePatch } from "@/lib/business/listing-image-patch";
import { uploadPortalImage } from "@/lib/portal/storage-upload";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ areaId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const blocked = await adminBusinessDirectEditApiBlocked();
  if (blocked) return blocked;

  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { areaId } = await context.params;
  const supabase = getServiceSupabase();

  const { data: area } = await supabase.from("areas").select("id, slug").eq("id", areaId).maybeSingle();
  if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 });

  const slug = String((area as { slug: string }).slug);
  let imageUrl: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    if (String(formData.get("clear") ?? "") === "true") {
      imageUrl = null;
    } else {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file." }, { status: 400 });
      }
      try {
        const uploaded = await uploadPortalImage(supabase, file, `admin/areas/${slug}`);
        imageUrl = uploaded.publicUrl;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
  } else {
    return NextResponse.json({ error: "Use multipart form upload." }, { status: 400 });
  }

  const patch = businessListingImagePatch(imageUrl);
  const { error } = await supabase.from("areas").update(patch!).eq("id", areaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    main_image_url: imageUrl,
    hero_image_url: imageUrl,
  });
}
