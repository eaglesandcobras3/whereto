import { NextRequest, NextResponse } from "next/server";
import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import { rentalsApiBlocked } from "@/lib/feature-flags";
import {
  bookingDestinationHost,
  buildPartnerBookingUrl,
  isBookingHostAllowed,
} from "@/lib/stays/booking-url";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type Props = { params: Promise<{ propertyId: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const blocked = await rentalsApiBlocked();
  if (blocked) return blocked;

  const { propertyId } = await params;
  const sp = request.nextUrl.searchParams;
  const checkIn = sp.get("check_in");
  const checkOut = sp.get("check_out");
  const guestsRaw = sp.get("guests");
  const guests = guestsRaw ? Number(guestsRaw) : null;

  const supabase = getServiceSupabase();
  const { data: property, error } = await supabase
    .from("rental_properties_view")
    .select(
      "id, business_id, partner_id, external_id, booking_url, status, partner_status, partner_booking_url_template, partner_booking_engine_base_url",
    )
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = property as Record<string, unknown>;
  if (row.status !== "published" || row.partner_status !== "active") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { data: partner } = await supabase
    .from("rental_partner_profiles")
    .select("id, booking_url_hosts, booking_url_template, booking_engine_base_url")
    .eq("id", row.partner_id as string)
    .maybeSingle();

  const partnerRow = (partner ?? {}) as Record<string, unknown>;
  const destination = buildPartnerBookingUrl({
    bookingUrl: row.booking_url as string | null,
    template:
      (partnerRow.booking_url_template as string | null) ||
      (row.partner_booking_url_template as string | null),
    baseUrl:
      (partnerRow.booking_engine_base_url as string | null) ||
      (row.partner_booking_engine_base_url as string | null),
    externalId: row.external_id as string | null,
    checkIn,
    checkOut,
    guests: Number.isFinite(guests) ? guests : null,
  });

  if (!destination) {
    return NextResponse.json({ error: "Booking URL missing" }, { status: 400 });
  }

  const hosts = (partnerRow.booking_url_hosts as string[] | null) ?? [];
  if (!isBookingHostAllowed(destination, hosts)) {
    return NextResponse.json({ error: "Destination not allowed" }, { status: 400 });
  }

  const referrerPath = request.headers.get("referer")?.slice(0, 500) ?? null;
  const ua = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  await supabase.from("rental_referral_clicks").insert({
    property_id: row.id,
    business_id: row.business_id,
    partner_id: row.partner_id,
    check_in: checkIn || null,
    check_out: checkOut || null,
    guests: Number.isFinite(guests) ? guests : null,
    destination_url: destination,
    referrer_path: referrerPath,
    user_agent: ua,
  });

  const ph = getPostHogServerClient();
  if (ph) {
    ph.capture({
      distinctId: "anonymous",
      event: "rental_booking_click",
      properties: {
        property_id: row.id,
        business_id: row.business_id || undefined,
        destination_host: bookingDestinationHost(destination),
        has_dates: Boolean(checkIn && checkOut),
        guests: Number.isFinite(guests) ? guests : undefined,
        source: "redirect",
      },
    });
    await ph.shutdown();
  }

  return NextResponse.redirect(destination, 302);
}
