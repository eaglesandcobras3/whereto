import { NextRequest, NextResponse } from "next/server";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { getAllFeatureFlags, isFreeOnboardEnabled } from "@/lib/feature-flags";
import { FREE_ONBOARD_OVERVIEW_MAX } from "@/lib/listing-requests/free-onboard-schema";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

/** Prefill payload for update/claim free intake (`?business=slug`). */
export async function GET(request: NextRequest) {
  const flags = await getAllFeatureFlags();
  if (!isFreeOnboardEnabled(flags)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("businesses_view")
    .select(
      "id, title, slug, town_id, address, website, phone, excerpt, overview, content, is_storefront, is_service_business, primary_category_id, service_category_id, search_tags, towns ( title, slug )",
    )
    .eq("slug", slug)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const townRel = data.towns as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;
  const town = Array.isArray(townRel) ? townRel[0] : townRel;

  return NextResponse.json({
    business: {
      id: String(data.id),
      title: String(data.title ?? ""),
      slug: String(data.slug ?? ""),
      town_id: data.town_id ? String(data.town_id) : null,
      town_title: town?.title ?? null,
      address: (data.address as string | null) ?? null,
      website: (data.website as string | null) ?? null,
      phone: (data.phone as string | null) ?? null,
      excerpt: (data.excerpt as string | null) ?? null,
      overview:
        (data.overview as string | null) ??
        (typeof data.content === "string" ? data.content.slice(0, FREE_ONBOARD_OVERVIEW_MAX) : null),
      is_storefront: Boolean(data.is_storefront),
      is_service_business: Boolean(data.is_service_business),
      category_id: data.primary_category_id ? String(data.primary_category_id) : null,
      service_category_id: data.service_category_id ? String(data.service_category_id) : null,
      search_tags: Array.isArray(data.search_tags)
        ? (data.search_tags as string[]).slice(0, 6)
        : [],
    },
  });
}
