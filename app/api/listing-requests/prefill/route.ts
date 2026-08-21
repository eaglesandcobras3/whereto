import { NextRequest, NextResponse } from "next/server";
import {
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { FREE_ONBOARD_OVERVIEW_MAX } from "@/lib/listing-requests/free-onboard-schema";
import { resolvePrefillCategory } from "@/lib/listing-requests/resolve-prefill-category";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

/** Prefill payload for update/claim free intake (`?business=slug`). */
export async function GET(request: NextRequest) {
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
      "id, title, slug, town_id, address, map_lat, map_lng, website, phone, excerpt, overview, content, is_storefront, is_service_business, primary_category_id, service_category_id, search_tags, main_image_url, hero_image_url, towns ( title, slug ), business_categories!primary_category_id ( id, title, slug, parent_category_id )",
    )
    .eq("slug", slug)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const townRel = data.towns as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;
  const town = Array.isArray(townRel) ? townRel[0] : townRel;

  const categoryRel = data.business_categories as
    | {
        id?: string;
        title?: string;
        slug?: string;
        parent_category_id?: string | null;
      }
    | {
        id?: string;
        title?: string;
        slug?: string;
        parent_category_id?: string | null;
      }[]
    | null;
  const categoryRow = Array.isArray(categoryRel) ? categoryRel[0] : categoryRel;

  let parentTitle: string | null = null;
  const parentId = categoryRow?.parent_category_id
    ? String(categoryRow.parent_category_id)
    : null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("business_categories")
      .select("title")
      .eq("id", parentId)
      .maybeSingle();
    parentTitle = parent?.title ? String(parent.title) : null;
  }

  const resolved = resolvePrefillCategory({
    primary_category_id: data.primary_category_id ? String(data.primary_category_id) : null,
    category: categoryRow
      ? {
          id: categoryRow.id,
          title: categoryRow.title,
          parent_category_id: categoryRow.parent_category_id,
          parent_title: parentTitle,
        }
      : null,
  });

  return NextResponse.json({
    business: {
      id: String(data.id),
      title: String(data.title ?? ""),
      slug: String(data.slug ?? ""),
      town_id: data.town_id ? String(data.town_id) : null,
      town_title: town?.title ?? null,
      address: (data.address as string | null) ?? null,
      map_lat:
        data.map_lat != null && Number.isFinite(Number(data.map_lat))
          ? Number(data.map_lat)
          : null,
      map_lng:
        data.map_lng != null && Number.isFinite(Number(data.map_lng))
          ? Number(data.map_lng)
          : null,
      website: (data.website as string | null) ?? null,
      phone: (data.phone as string | null) ?? null,
      excerpt: (data.excerpt as string | null) ?? null,
      overview:
        (data.overview as string | null) ??
        (typeof data.content === "string" ? data.content.slice(0, FREE_ONBOARD_OVERVIEW_MAX) : null),
      is_storefront: Boolean(data.is_storefront),
      is_service_business: Boolean(data.is_service_business),
      category_id: resolved.category_id,
      category_title: resolved.category_title,
      category_group_title: resolved.category_group_title,
      /** @deprecated Not used for unified intake prefill. */
      service_category_id: data.service_category_id ? String(data.service_category_id) : null,
      search_tags: Array.isArray(data.search_tags)
        ? (data.search_tags as string[]).slice(0, 6)
        : [],
      main_image_url:
        (data.main_image_url as string | null) ??
        (data.hero_image_url as string | null) ??
        null,
    },
  });
}
