import { NextRequest, NextResponse } from "next/server";
import {
  businessPhotosApiBlocked,
  getAllFeatureFlags,
  isFreeOnboardEnabled,
} from "@/lib/feature-flags";
import { FREE_ONBOARD_PHOTOS_MAX } from "@/lib/listing-requests/free-onboard-schema";
import { uploadPortalImage } from "@/lib/portal/storage-upload";
import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * Public free-intake gallery upload (WebP, max 1600px).
 * Returns URLs for the form to attach on `/api/listing-requests` submit.
 */
export async function POST(request: NextRequest) {
  const photosBlocked = await businessPhotosApiBlocked();
  if (photosBlocked) return photosBlocked;

  const flags = await getAllFeatureFlags();
  if (!isFreeOnboardEnabled(flags)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isListingRequestRateLimited(`listing-photo:${rateLimitKeyFromRequest(request)}`)) {
    return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  // Soft client-side cap: reject huge blobs before sharp work.
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 12MB." }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const uploaded = await uploadPortalImage(supabase, file, "free-onboard/intake");
    return NextResponse.json({
      ok: true,
      public_url: uploaded.publicUrl,
      storage_path: uploaded.storagePath,
      max_photos: FREE_ONBOARD_PHOTOS_MAX,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
