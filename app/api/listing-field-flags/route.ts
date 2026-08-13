import { NextRequest, NextResponse } from "next/server";
import { getAllFeatureFlags, isFeedbackFeatureEnabled } from "@/lib/feature-flags";
import {
  currentValueForBusinessGroup,
  currentValueForGuideGroup,
  currentValueForHubSuggestion,
  currentValueForPlaceGroup,
  currentValueForRentalGroup,
  isHubSuggestionField,
  listingFieldFlagBodySchema,
  LISTING_FIELD_FLAG_TYPE,
  type ListingFieldFlagEntity,
  type ListingFieldFlagField,
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

function insertFailedResponse(
  context: string,
  insertErr: { message?: string; code?: string; details?: string; hint?: string },
) {
  console.error(
    `[listing-field-flag] ${context} insert`,
    JSON.stringify({
      message: insertErr.message,
      code: insertErr.code,
      details: insertErr.details,
      hint: insertErr.hint,
    }),
  );
  const body: { error: string; detail?: string } = { error: "Could not save your report." };
  if (process.env.NODE_ENV !== "production" && insertErr.message) {
    body.detail = insertErr.message;
  }
  return NextResponse.json(body, { status: 500 });
}

function payloadFor(
  entity: ListingFieldFlagEntity,
  field: ListingFieldFlagField,
  title: string,
  slug: string,
  currentValue: string | null,
  note: string | null,
  reporterEmail: string | null,
  sectionTitle: string | null = null,
): ListingFieldFlagPayload {
  return {
    source: "listing_field_flag",
    entity,
    field,
    note,
    listing_title: title,
    listing_slug: slug,
    business_title: title,
    business_slug: slug,
    current_value: currentValue,
    reporter_email: reporterEmail,
    section_title: sectionTitle,
  };
}

function valueForField(
  field: ListingFieldFlagField,
  pageTitle: string,
  section: string | null,
  fallback: string | null,
): string | null {
  if (isHubSuggestionField(field)) return currentValueForHubSuggestion(pageTitle, section);
  return fallback;
}

/**
 * Public: flag an incorrect section on a business, rental, town, area, or guide.
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

  const parsed = listingFieldFlagBodySchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstFieldError = Object.values(fieldErrors)
      .flatMap((msgs) => msgs ?? [])
      .find((m) => typeof m === "string" && m.trim());
    return NextResponse.json(
      {
        error: firstFieldError || "Check the form and try again.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const entityId = d.entity_id ?? d.business_id;
  const supabase = getServiceSupabase();

  if (d.entity === "hub") {
    const title = d.page_title || "WhereTo30A";
    const slug = d.page_slug || "";
    const { error: insertErr } = await supabase.from("portal_review_items").insert({
      type: LISTING_FIELD_FLAG_TYPE,
      status: "pending",
      business_id: null,
      submitted_by: null,
      payload: payloadFor(
        "hub",
        d.field,
        title,
        slug,
        valueForField(d.field, title, d.section, title),
        d.note,
        d.reporter_email,
        d.section,
      ),
    });
    if (insertErr) {
      return insertFailedResponse("hub", insertErr);
    }
    return NextResponse.json({ ok: true });
  }

  if (!entityId) {
    return NextResponse.json({ error: "Listing id required." }, { status: 400 });
  }

  if (d.entity === "category") {
    const { data: cat, error } = await supabase
      .from("business_categories")
      .select("id, title, slug")
      .eq("id", entityId)
      .is("archived_at", null)
      .maybeSingle();

    if (error || !cat) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const row = cat as { id: string; title: string; slug: string };
    const title = d.page_title || String(row.title ?? "Category");
    const slug = d.page_slug || String(row.slug ?? "");
    const { error: insertErr } = await supabase.from("portal_review_items").insert({
      type: LISTING_FIELD_FLAG_TYPE,
      status: "pending",
      business_id: null,
      submitted_by: null,
      payload: payloadFor(
        "category",
        d.field,
        title,
        slug,
        valueForField(d.field, title, d.section, title),
        d.note,
        d.reporter_email,
        d.section,
      ),
    });
    if (insertErr) {
      return insertFailedResponse("category", insertErr);
    }
    return NextResponse.json({ ok: true });
  }

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
    const { error: insertErr } = await supabase.from("portal_review_items").insert({
      type: LISTING_FIELD_FLAG_TYPE,
      status: "pending",
      business_id: row.business_id,
      submitted_by: null,
      payload: payloadFor(
        "rental",
        d.field,
        title,
        slug,
        valueForField(
          d.field,
          title,
          d.section,
          currentValueForRentalGroup(d.field, { ...row, property_type_label: typeLabel }),
        ),
        d.note,
        d.reporter_email,
        d.section,
      ),
    });

    if (insertErr) {
      return insertFailedResponse("rental", insertErr);
    }
    return NextResponse.json({ ok: true });
  }

  if (d.entity === "town") {
    const { data: town, error } = await supabase
      .from("towns")
      .select("id, title, slug, excerpt, status")
      .eq("id", entityId)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .maybeSingle();

    if (error || !town) {
      return NextResponse.json({ error: "Town not found." }, { status: 404 });
    }

    const row = town as { id: string; title: string; slug: string; excerpt: string | null };
    const title = String(row.title ?? "Town");
    const slug = String(row.slug ?? "");
    const { error: insertErr } = await supabase.from("portal_review_items").insert({
      type: LISTING_FIELD_FLAG_TYPE,
      status: "pending",
      business_id: null,
      submitted_by: null,
      payload: payloadFor(
        "town",
        d.field,
        title,
        slug,
        valueForField(
          d.field,
          title,
          d.section,
          currentValueForPlaceGroup(d.field, { title, excerpt: row.excerpt }),
        ),
        d.note,
        d.reporter_email,
        d.section,
      ),
    });

    if (insertErr) {
      return insertFailedResponse("town", insertErr);
    }
    return NextResponse.json({ ok: true });
  }

  if (d.entity === "area") {
    const { data: area, error } = await supabase
      .from("areas")
      .select("id, title, slug, excerpt, towns ( title ), status")
      .eq("id", entityId)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .maybeSingle();

    if (error || !area) {
      return NextResponse.json({ error: "Area not found." }, { status: 404 });
    }

    const row = area as Record<string, unknown>;
    const townsEmbed = row.towns as { title?: string } | { title?: string }[] | null;
    const townOne = townsEmbed && Array.isArray(townsEmbed) ? townsEmbed[0] : townsEmbed;
    const title = String(row.title ?? "Area");
    const slug = String(row.slug ?? "");
    const { error: insertErr } = await supabase.from("portal_review_items").insert({
      type: LISTING_FIELD_FLAG_TYPE,
      status: "pending",
      business_id: null,
      submitted_by: null,
      payload: payloadFor(
        "area",
        d.field,
        title,
        slug,
        valueForField(
          d.field,
          title,
          d.section,
          currentValueForPlaceGroup(d.field, {
            title,
            excerpt: (row.excerpt as string | null) ?? null,
            town_title: townOne?.title?.trim() || null,
          }),
        ),
        d.note,
        d.reporter_email,
        d.section,
      ),
    });

    if (insertErr) {
      return insertFailedResponse("area", insertErr);
    }
    return NextResponse.json({ ok: true });
  }

  if (d.entity === "guide") {
    const { data: guide, error } = await supabase
      .from("guides")
      .select("id, title, slug, excerpt, content, status")
      .eq("id", entityId)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .maybeSingle();

    if (error || !guide) {
      return NextResponse.json({ error: "Guide not found." }, { status: 404 });
    }

    const row = guide as {
      id: string;
      title: string;
      slug: string;
      excerpt: string | null;
      content: string | null;
    };
    const title = String(row.title ?? "Guide");
    const slug = String(row.slug ?? "");
    const { error: insertErr } = await supabase.from("portal_review_items").insert({
      type: LISTING_FIELD_FLAG_TYPE,
      status: "pending",
      business_id: null,
      submitted_by: null,
      payload: payloadFor(
        "guide",
        d.field,
        title,
        slug,
        valueForField(
          d.field,
          title,
          d.section,
          currentValueForGuideGroup(d.field, {
            title,
            excerpt: row.excerpt,
            content: row.content,
          }),
        ),
        d.note,
        d.reporter_email,
        d.section,
      ),
    });

    if (insertErr) {
      return insertFailedResponse("guide", insertErr);
    }
    return NextResponse.json({ ok: true });
  }

  // business (default)
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
  const { error: insertErr } = await supabase.from("portal_review_items").insert({
    type: LISTING_FIELD_FLAG_TYPE,
    status: "pending",
    business_id: String(row.id),
    submitted_by: null,
    payload: payloadFor(
      "business",
      d.field,
      title,
      slug,
      valueForField(d.field, title, d.section, currentValueForBusinessGroup(d.field, normalized)),
      d.note,
      d.reporter_email,
      d.section,
    ),
  });

  if (insertErr) {
    return insertFailedResponse("business", insertErr);
  }

  return NextResponse.json({ ok: true });
}
