import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";

export type DiscoverTownOption = {
  id: string;
  name: string;
  slug: string;
};

export type DiscoverCategoryOption = {
  id: string;
  slug: string;
  title: string;
};

export type DiscoverServiceCategoryOption = {
  id: string;
  slug: string;
  title: string;
};

export async function loadDiscoverFilterOptions(): Promise<{
  towns: DiscoverTownOption[];
  categories: DiscoverCategoryOption[];
  serviceCategories: DiscoverServiceCategoryOption[];
}> {
  const supabase = getServiceSupabase();

  const [townsRes, categoriesRes, serviceCategoriesRes] = await Promise.all([
    supabase
      .from("towns")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title", { ascending: true }),
    supabase
      .from("business_categories")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title", { ascending: true }),
    supabase
      .from("service_categories")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("sort", { ascending: true }),
  ]);

  return {
    towns: (townsRes.data ?? []).map((r) => {
      const row = r as { id: string; title: string; slug: string };
      return { id: row.id, name: row.title, slug: row.slug };
    }),
    categories: (categoriesRes.data ?? []).map((r) => {
      const row = r as { id: string; title: string; slug: string };
      return {
        id: row.id,
        slug: row.slug,
        title: displayStorefrontCategoryTitle(row.slug, row.title),
      };
    }),
    serviceCategories: (serviceCategoriesRes.data ?? []).map((r) => {
      const row = r as { id: string; title: string; slug: string };
      return { id: row.id, slug: row.slug, title: row.title };
    }),
  };
}
