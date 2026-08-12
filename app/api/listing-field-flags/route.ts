import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllFeatureFlags, isFeedbackFeatureEnabled } from "@/lib/feature-flags";
import {
  currentValueForBusinessGroup,
  currentValueForRentalGroup,
  LISTING_FIELD_FLAG_ENTITIES,
  LISTING_FIELD_FLAG_FIELDS,
  LISTING_FIELD_FLAG_TYPE,
  type ListingFieldFlagPayload,
} from "@/lib/listing-requests/listing-field-flag";
import { isListingRequestRateLimited, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { PROPERTY_TYPE_LABELS } from "@/lib/stays/constants";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const bodySchema = z.object({
  entity: z.enum(LISTING_FIELD_FLAG_ENTITIES).default("business"),
  /** Business id when entity=business; rental property id when entity=rental. */
  entity_id: z.string().uuid().optional(),
  /** @deprecated Prefer entity_id — older clients sent business_id only. */
  business_id: z.string().uuid().optional(),
  field: z.enum(LISTING_FIELD_FLAG_FIELDS),
  note: z
    .string()
    .max(500)
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t || null;
    }),
  reporter_email: z
    .string()
    .max(320)
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t || null;
    })
    .refine((s) => s == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), {
      message: "Enter a valid email.",
    }),
});

/**
 * Public: flag an incorrect section on an unverified business or rental listing.
 * Creates a `listing_field_flag` portal review item.
 */
export async function POST(request: NextRequest) {
  const flags = await getAllFeatureFlags();
  if (!isFeedbackFeatureEnabled(flags)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isListingRequestRateLimited(`field-flag:${rateLimitKeyFromRequest(request)}`)) {
    return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form and try again.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const entityId = d.entity_id ?? d.business_id;
  if (!entityId) {
    return NextResponse.json({ error: "Listing id required." }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  if (d.entity === "rental") {
    const { data: prop, error: propErr } = await supabase
      .from("rental_properties_view")
      .select(
        "id, title, slug, description, excerpt, street_address, map_lat, map_lng, search_tags, property_type, town_title, area_title, business_id, business_is_verified, status",
      )
      .eq("id", entityId)
      .eq("status", "published")
      .maybeSingle();

    if (propErr || !prop) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    if (Boolean((prop as { business_is_verified?: boolean | null }).business_is_verified)) {
      return NextResponse.json(
        { error: "This listing is verified — use the owner update flow or general feedback." },
        { status: 400 },
      );
    }

    const row = prop as {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      excerpt: string | null;
      street_address: string | null;
      map_lat: number | null;
      map_lng: number | null;
      search_tags: unknown;
      property_type: string | null;
      town_title: string | null;
      area_title: string | null;
      business_id: string | null;
    };

    const typeLabel = row.property_type
      ? (PROPERTY_TYPE_LABELS[row.property_type] ?? row.property_type)
      : null;
    const title = String(row.title ?? "Stay");
    const slug = String(row.slug ?? "");
    const payload: ListingFieldFlagPayload = {
      source: "listing_field_flag",
      entity: "rental",
      field: d.field,
      note: d.note,
      listing_title: title,
      listing_slug: slug,
      business_title: title,
      business_slug: slug,
      current_value: currentValueForRentalGroup(d.field, {
        ...row,
        property_type_label: typeLabel,
      }),
      reporter_email: d.reporter_email,
    };

    const { error: insertErr } = await supabase.from("portal_review_items").insert({
      type: LISTING_FIELD_FLAG_TYPE,
      status: "pending",
      business_id: row.business_id,
      submitted_by: null,
      payload,
    });

    if (insertErr) {
      console.error("[listing-field-flag] rental insert", insertErr);
      return NextResponse.json({ error: "Could not save your report." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const { data: biz, error: bizErr } = await supabase
    .from("businesses_view")
    .select(
      "id, title, slug, address, phone, website, overview, excerpt, map_lat, map_lng, search_tags, is_verified, town_id, area_id, primary_category_id, towns ( title ), areas ( title ), business_categories ( title )",
    )
    .eq("id", entityId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .maybeSingle();

  if (bizErr || !biz) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (Boolean((biz as { is_verified?: boolean }).is_verified)) {
    return NextResponse.json(
      { error: "This listing is verified — use the owner update flow or general feedback." },
      { status: 400 },
    );
  }

  const row = biz as Record<string, unknown>;
  const townsEmbed = row.towns as { title?: string } | { title?: string }[] | null;
  const areasEmbed = row.areas as { title?: string } | { title?: string }[] | null;
  const catsEmbed = row.business_categories as
    | { title?: string }
    | { title?: string }[]
    | null;
  const townOne = townsEmbed && Array.isArray(townsEmbed) ? townsEmbed[0] : townsEmbed;
  const areaOne = areasEmbed && Array.isArray(areasEmbed) ? areasEmbed[0] : areasEmbed;
  const catOne = catsEmbed && Array.isArray(catsEmbed) ? catsEmbed[0] : catsEmbed;

  const normalized = {
    title: String(row.title ?? "Business"),
    address: (row.address as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    overview: (row.overview as string | null) ?? null,
    excerpt: (row.excerpt as string | null) ?? null,
    map_lat: (row.map_lat as number | null) ?? null,
    map_lng: (row.map_lng as number | null) ?? null,
    search_tags: row.search_tags,
    town_title: townOne?.title?.trim() || null,
    area_title: areaOne?.title?.trim() || null,
    category_title: catOne?.title?.trim() || null,
  };

  const title = normalized.title;
  const slug = String(row.slug ?? "");
  const payload: ListingFieldFlagPayload = {
    source: "listing_field_flag",
    entity: "business",
    field: d.field,
    note: d.note,
    listing_title: title,
    listing_slug: slug,
    business_title: title,
    business_slug: slug,
    current_value: currentValueForBusinessGroup(d.field, normalized),
    reporter_email: d.reporter_email,
  };

  const { error: insertErr } = await supabase.from("portal_review_items").insert({
    type: LISTING_FIELD_FLAG_TYPE,
    status: "pending",
    business_id: String(row.id),
    submitted_by: null,
    payload,
  });

  if (insertErr) {
    console.error("[listing-field-flag] insert", insertErr);
    return NextResponse.json({ error: "Could not save your report." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
