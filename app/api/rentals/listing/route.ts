import { NextRequest, NextResponse } from "next/server";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import {
  listingFieldsFromFormData,
  listingPhotoFilesFromFormData,
  rentalListingSubmissionSchema,
} from "@/lib/stays/listing-submission-schema";
import { submitRentalListing } from "@/lib/stays/submit-listing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;

  const contentType = request.headers.get("content-type") ?? "";
  let fields: unknown;
  let photos: File[] = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      fields = listingFieldsFromFormData(fd);
      photos = listingPhotoFilesFromFormData(fd);
    } else {
      fields = await request.json();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = rentalListingSubmissionSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid listing" },
      { status: 400 },
    );
  }

  try {
    const result = await submitRentalListing(parsed.data, photos);
    const ph = getPostHogServerClient();
    if (ph) {
      ph.capture({
        distinctId: "anonymous",
        event: "rental_listing_submitted",
        properties: {
          property_id: result.propertyId,
          partner_id: result.partnerId,
          partner_created: result.partnerCreated,
          town_id: parsed.data.town_id,
          property_type: parsed.data.property_type,
          photo_count: result.photoCount,
          has_street_address: Boolean(parsed.data.street_address),
        },
      });
      await ph.shutdown();
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    if (message === "Rejected") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
