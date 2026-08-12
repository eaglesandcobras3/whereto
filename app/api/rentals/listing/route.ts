import { NextRequest, NextResponse } from "next/server";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { rentalListingSubmissionSchema } from "@/lib/stays/listing-submission-schema";
import { submitRentalListing } from "@/lib/stays/submit-listing";

export async function POST(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = rentalListingSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid listing" },
      { status: 400 },
    );
  }

  try {
    const result = await submitRentalListing(parsed.data);
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
