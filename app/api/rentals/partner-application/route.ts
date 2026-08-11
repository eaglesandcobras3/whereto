import { NextRequest, NextResponse } from "next/server";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import { rentalPartnerApplicationSchema } from "@/lib/stays/partner-application-schema";
import { submitRentalPartnerApplication } from "@/lib/stays/partner-application";

export async function POST(request: NextRequest) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = rentalPartnerApplicationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid application" },
      { status: 400 },
    );
  }

  try {
    const result = await submitRentalPartnerApplication(parsed.data);
    const ph = getPostHogServerClient();
    if (ph) {
      ph.capture({
        distinctId: "anonymous",
        event: "rental_partner_application_submitted",
        properties: {
          business_id: result.businessId,
          partner_id: result.partnerId,
          import_method: parsed.data.import_method,
          pms_name: parsed.data.pms_name ?? undefined,
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
