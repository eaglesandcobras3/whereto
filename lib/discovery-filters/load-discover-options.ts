import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import {
  BUSINESS_CATEGORY_GROUP_LABELS,
  BUSINESS_CATEGORY_GROUP_SLUGS,
} from "@/lib/business-categories/groups";
import {
  SERVICE_CATEGORY_GROUP_LABELS,
  SERVICE_CATEGORY_GROUP_SLUGS,
} from "@/lib/service-categories/groups";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";

export type DiscoverTownOption = {
  id: string;
  name: string;
  slug: string;
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
};

export async function loadDiscoverFilterOptions(): Promise<{
  towns: DiscoverTownOption[];
  categories: DiscoverCategoryOption[];
  serviceCategories: DiscoverServiceCategoryOption[];
  searchTags: DiscoverSearchTagOption[];
}> {
  const supabase = getServiceSupabase();

  const townsRes = await supabase
    .from("towns")
    .select("id, title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title", { ascending: true });

  const vocabRes = await supabase
    .from("search_tags_vocabulary")
    .select("tag")
    .order("tag", { ascending: true });

  return {
    towns: (townsRes.data ?? []).map((r) => {
      const row = r as { id: string; title: string; slug: string };
      return { id: row.id, name: row.title, slug: row.slug };
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
      const slug = String((row as { tag: string }).tag);
      return { slug, label: formatSearchTagLabel(slug) };
    }),
  };
}
