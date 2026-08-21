import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import {
  BIZ_CATEGORY_SELECT,
  rowToCategoryBusiness,
  type CategoryBusiness,
} from "@/lib/data/place-category-sections";
import {
  groupBusinessesIntoBrowseSections,
  groupBusinessesIntoLeafSections,
  type BrowseGroupSection,
} from "@/lib/business-categories/group-browse-sections";

const TOWN_AREAS_CANDIDATE_CAP = 50;
const TOWN_BROWSE_BUSINESS_CAP = 500;

function mergeCategoryBusinessRows(
  rows: Record<string, unknown>[],
  into: Map<string, CategoryBusiness>,
) {
  for (const row of rows) {
    const id = String(row.id);
    if (!into.has(id)) into.set(id, rowToCategoryBusiness(row));
  }
}

function toBrowseBusinessInput(business: CategoryBusiness) {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    hero_image_url: business.hero_image_url,
    ai_one_liner: business.ai_one_liner,
    ai_summary: business.ai_summary,
    categorySlug: business.categorySlug,
    categoryTitle: business.categoryTitle,
  };
}

/** Same storefront set the town hub groups into collapsible rollup sections. */
export async function loadTownBrowseBusinessesForAreaIds(
  supabase: SupabaseClient,
  townId: string,
  townAreaIds: string[],
): Promise<CategoryBusiness[]> {
  const bizInTownQuery = supabase
    .from("businesses_view")
    .select(BIZ_CATEGORY_SELECT)
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .eq("is_explorable", true)
    .limit(TOWN_BROWSE_BUSINESS_CAP);

  const bizInTownAreasQuery =
    townAreaIds.length > 0
      ? supabase
          .from("businesses_view")
          .select(BIZ_CATEGORY_SELECT)
          .in("area_id", townAreaIds)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .eq("is_storefront", true)
          .eq("is_explorable", true)
          .limit(TOWN_BROWSE_BUSINESS_CAP)
      : Promise.resolve({ data: [] as Record<string, unknown>[] | null });

  const [bizTownRes, bizAreaRes] = await Promise.all([bizInTownQuery, bizInTownAreasQuery]);
  const businessById = new Map<string, CategoryBusiness>();
  mergeCategoryBusinessRows((bizTownRes.data ?? []) as Record<string, unknown>[], businessById);
  mergeCategoryBusinessRows((bizAreaRes.data ?? []) as Record<string, unknown>[], businessById);
  return [...businessById.values()];
}

export async function loadTownBrowseBusinesses(townId: string): Promise<CategoryBusiness[]> {
  const supabase = getServiceSupabase();

  const { data: areaRows } = await supabase
    .from("areas_view")
    .select("id")
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .limit(TOWN_AREAS_CANDIDATE_CAP);

  const townAreaIds = (areaRows ?? []).map((row) => String((row as { id: string }).id));
  return loadTownBrowseBusinessesForAreaIds(supabase, townId, townAreaIds);
}

export function browseSectionsFromCategoryBusinesses(
  businesses: CategoryBusiness[],
): BrowseGroupSection[] {
  return groupBusinessesIntoBrowseSections(businesses.map(toBrowseBusinessInput));
}

export function leafSectionsFromCategoryBusinesses(
  businesses: CategoryBusiness[],
): BrowseGroupSection[] {
  return groupBusinessesIntoLeafSections(businesses.map(toBrowseBusinessInput));
}

export async function getCategorySectionsForTown(townId: string): Promise<BrowseGroupSection[]> {
  const businesses = await loadTownBrowseBusinesses(townId);
  return browseSectionsFromCategoryBusinesses(businesses);
}

/** Rollup + populated leaf sections for town intent pages and sitemap. */
export async function getTownIntentSectionsForTown(townId: string): Promise<{
  rollupSections: BrowseGroupSection[];
  leafSections: BrowseGroupSection[];
}> {
  const businesses = await loadTownBrowseBusinesses(townId);
  return {
    rollupSections: browseSectionsFromCategoryBusinesses(businesses),
    leafSections: leafSectionsFromCategoryBusinesses(businesses),
  };
}
