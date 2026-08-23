import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import {
  BUSINESS_CATEGORY_GROUP_LABELS,
  BUSINESS_CATEGORY_GROUP_SLUGS,
} from "@/lib/business-categories/groups";
import {
  SERVICE_CATEGORY_GROUP_LABELS,
  SERVICE_CATEGORY_GROUP_SLUGS,
} from "@/lib/service-categories/groups";
import { labelForSearchTag } from "@/lib/discovery-filters/search-tag-label";
import { TOWNS_HUB_INCLUDE_OR_FILTER } from "@/lib/places/hub-browse-visibility";

export type DiscoverTownOption = {
  id: string;
  name: string;
  slug: string;
  /** Town center for map jump-to (optional until pin is filled). */
  map_lat: number | null;
  map_lng: number | null;
};

export type DiscoverCategoryOption = {
  slug: string;
  title: string;
};

export type DiscoverServiceCategoryOption = {
  slug: string;
  title: string;
};

export type DiscoverSearchTagOption = {
  slug: string;
  label: string;
  count?: number;
};

export async function loadDiscoverFilterOptions(): Promise<{
  towns: DiscoverTownOption[];
  categories: DiscoverCategoryOption[];
  serviceCategories: DiscoverServiceCategoryOption[];
  searchTags: DiscoverSearchTagOption[];
}> {
  const supabase = getServiceSupabase();

  let townsRes = await supabase
    .from("towns")
    .select("id, title, slug, map_lat, map_lng")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(TOWNS_HUB_INCLUDE_OR_FILTER)
    .order("title", { ascending: true });
  if (townsRes.error?.message.includes("include_on_towns_hub")) {
    townsRes = await supabase
      .from("towns")
      .select("id, title, slug, map_lat, map_lng")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("title", { ascending: true });
  }

  const vocabRes = await supabase
    .from("search_tags_vocabulary")
    .select("tag, description")
    .order("tag", { ascending: true });

  return {
    towns: (townsRes.data ?? []).map((r) => {
      const row = r as {
        id: string;
        title: string;
        slug: string;
        map_lat?: number | null;
        map_lng?: number | null;
      };
      const lat = typeof row.map_lat === "number" && Number.isFinite(row.map_lat) ? row.map_lat : null;
      const lng = typeof row.map_lng === "number" && Number.isFinite(row.map_lng) ? row.map_lng : null;
      return {
        id: row.id,
        name: row.title,
        slug: row.slug,
        map_lat: lat,
        map_lng: lng,
      };
    }),
    categories: BUSINESS_CATEGORY_GROUP_SLUGS.map((slug) => ({
      slug,
      title: BUSINESS_CATEGORY_GROUP_LABELS[slug],
    })),
    serviceCategories: SERVICE_CATEGORY_GROUP_SLUGS.map((slug) => ({
      slug,
      title: SERVICE_CATEGORY_GROUP_LABELS[slug],
    })),
    searchTags: (vocabRes.data ?? []).map((row) => {
      const r = row as { tag: string; description?: string | null };
      const slug = String(r.tag);
      return { slug, label: labelForSearchTag(slug, r.description) };
    }),
  };
}
