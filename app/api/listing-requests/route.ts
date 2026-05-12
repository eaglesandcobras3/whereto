import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { findSimilarBusinessesForListingRequest } from "@/lib/listing-requests/find-similar-businesses";
import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";

const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine((s) => s === "" || /^https?:\/\/.+/i.test(s), "Use a full URL starting with http:// or https://");

const bodySchema = z.object({
  _hp_company_website: z.string().max(200).optional(),
  submitter_name: z.string().trim().min(1).max(120),
  submitter_email: z.string().trim().email().max(320),
  submitter_phone: z
    .string()
    .max(40)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  title: z.string().trim().min(2).max(200),
  town_id: z.string().uuid(),
  primary_category_id: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .transform((s) => (s == null || s === "" ? null : s)),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  website: optionalUrl.transform((s) => (s === "" ? null : s)),
  phone: z
    .string()
    .max(40)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  email: z
    .string()
    .max(320)
    .optional()
    .transform((s) => (s ?? "").trim() || null)
    .refine((s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Invalid business email"),
  description: z.string().trim().min(15).max(4000),
  is_storefront: z.boolean().optional().default(false),
  is_service_business: z.boolean().optional().default(false),
  service_area: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  map_lat: z
    .union([z.number(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v == null || !Number.isFinite(v) ? null : v)),
  map_lng: z
    .union([z.number(), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v == null || !Number.isFinite(v) ? null : v)),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.flatten();
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: issues.fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  if ((d._hp_company_website ?? "").trim()) {
    return NextResponse.json({ ok: true });
  }

  if (isListingRequestRateLimited(`listing-req:${rateLimitKeyFromRequest(request)}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!d.is_storefront && !d.is_service_business) {
    return NextResponse.json(
      { error: "Select whether you have a storefront, offer on-site/mobile service, or both." },
      { status: 400 },
    );
  }

  const townQ = supabase
    .from("towns")
    .select("id")
    .eq("id", d.town_id)
    .is("archived_at", null)
    .maybeSingle();
  const categoryQ = d.primary_category_id
    ? supabase
        .from("business_categories")
        .select("id")
        .eq("id", d.primary_category_id)
        .is("archived_at", null)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [{ data: town }, { data: categoryRow }] = await Promise.all([townQ, categoryQ]);

  if (!town) {
    return NextResponse.json({ error: "Choose a valid town." }, { status: 400 });
  }
  if (d.primary_category_id && !categoryRow) {
    return NextResponse.json({ error: "Choose a valid category or leave it blank." }, { status: 400 });
  }

  let similar: Awaited<ReturnType<typeof findSimilarBusinessesForListingRequest>>;
  try {
    similar = await findSimilarBusinessesForListingRequest(supabase, {
      title: d.title,
      townId: d.town_id,
      mapLat: d.map_lat,
      mapLng: d.map_lng,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("findSimilarBusinessesForListingRequest", e);
    return NextResponse.json({ error: "Could not complete request." }, { status: 500 });
  }

  const { responseHits, duplicateIdsForRow } = similar;

  const { data: inserted, error } = await supabase
    .from("business_listing_requests")
    .insert({
      submitter_name: d.submitter_name,
      submitter_email: d.submitter_email,
      submitter_phone: d.submitter_phone,
      title: d.title,
      town_id: d.town_id,
      primary_category_id: d.primary_category_id,
      address: d.address,
      website: d.website,
      phone: d.phone,
      email: d.email,
      description: d.description,
      is_storefront: d.is_storefront,
      is_service_business: d.is_service_business,
      service_area: d.service_area,
      map_lat: d.map_lat,
      map_lng: d.map_lng,
      possible_duplicate_business_ids: duplicateIdsForRow,
      source_ip: rateLimitKeyFromRequest(request),
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("business_listing_requests insert", error);
    return NextResponse.json({ error: "Could not save request." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted?.id ?? null,
    similar: responseHits,
  });
}
