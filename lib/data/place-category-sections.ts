import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import type { BrowseBusinessCard } from "@/lib/data/business-browse-cards";
import type { PublicPlacePage } from "@/lib/data/public-place-by-slug";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";

import {
  PLACE_CATEGORY_SLUG_ORDER,
  PLACE_CATEGORY_ICONS,
  PER_PLACE_CATEGORY_PREVIEW,
  sortBrowseBusinesses,
  type PlaceCategorySection,
} from "@/lib/data/place-category-shared";
import { groupBusinessesIntoBrowseSections, type BrowseGroupSection } from "@/lib/business-categories/group-browse-sections";

export {
  PLACE_CATEGORY_SLUG_ORDER,
  PLACE_CATEGORY_ICONS,
  PER_PLACE_CATEGORY_PREVIEW,
  sortBrowseBusinesses,
};
export type { PlaceCategorySection };

export const BIZ_CATEGORY_SELECT =
  "id, title, slug, area_id, excerpt, primary_category_id, main_image, hero_image, main_image_url, hero_image_url, business_categories ( id, title, slug )";

export type CategoryBusiness = BrowseBusinessCard & {
  categoryId: string | null;
  categoryTitle: string | null;
  categorySlug: string | null;
};

export function rowToCategoryBusiness(row: Record<string, unknown>): CategoryBusiness {
  const hero = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  const excerpt = (row.excerpt as string | null) ?? null;
  const cat = row.business_categories as { id?: string; title?: string; slug?: string } | null;
  return {
    id: String(row.id),
    name: String((row as { title: string }).title),
    slug: String((row as { slug: string }).slug),
    hero_image_url: hero,
    ai_one_liner: excerpt,
    ai_summary: excerpt,
    categoryId: cat?.id ?? (row.primary_category_id as string | null) ?? null,
    categoryTitle: cat?.title
      ? displayStorefrontCategoryTitle(cat.slug ?? "", cat.title)
      : null,
    categorySlug: cat?.slug ?? null,
  };
}

export function groupBusinessesByCategorySections(
  businesses: CategoryBusiness[],
  _dailyPickSaltPrefix?: string,
): PlaceCategorySection[] {
  const priorityOrder = PLACE_CATEGORY_SLUG_ORDER as readonly string[];
  const priorityIndex = new Map(priorityOrder.map((slug, index) => [slug, index]));
  const map = new Map<string, { id: string; title: string; slug: string; pool: CategoryBusiness[] }>();

  const UNCATEGORIZED_KEY = "__uncategorized__";

  for (const b of businesses) {
    if (b.categorySlug && b.categoryTitle && b.categoryId) {
      if (!map.has(b.categoryId)) {
        map.set(b.categoryId, {
          id: b.categoryId,
          title: displayStorefrontCategoryTitle(b.categorySlug, b.categoryTitle),
          slug: b.categorySlug,
          pool: [],
        });
      }
      map.get(b.categoryId)!.pool.push(b);
    } else {
      if (!map.has(UNCATEGORIZED_KEY)) {
        map.set(UNCATEGORIZED_KEY, {
          id: UNCATEGORIZED_KEY,
          title: "More local spots",
          slug: UNCATEGORIZED_KEY,
          pool: [],
        });
      }
      map.get(UNCATEGORIZED_KEY)!.pool.push(b);
    }
  }

  return [...map.values()]
    .map((cat) => {
      const sorted = sortBrowseBusinesses(cat.pool);
      return {
        id: cat.id,
        title: cat.title,
        slug: cat.slug,
        totalCount: sorted.length,
        businesses: sorted,
      };
    })
    .filter((section) => section.totalCount > 0)
    .sort((a, b) => {
      const aPriority = priorityIndex.get(a.slug);
      const bPriority = priorityIndex.get(b.slug);
      if (aPriority != null && bPriority != null) return aPriority - bPriority;
      if (aPriority != null) return -1;
      if (bPriority != null) return 1;
      return a.title.localeCompare(b.title);
    });
}

function mergeCategoryBusinessRows(
  rows: Record<string, unknown>[],
  into: Map<string, CategoryBusiness>,
) {
  for (const row of rows) {
    const id = String(row.id);
    if (!into.has(id)) into.set(id, rowToCategoryBusiness(row));
  }
}

/** Businesses linked to an area hub or POI (column + `area_businesses` join). */
export async function getCategorySectionsForPublicPlace(
  place: PublicPlacePage,
): Promise<BrowseGroupSection[]> {
  const supabase = getServiceSupabase();
  const byId = new Map<string, CategoryBusiness>();
  const cap = 500;

  const browseQuery = () =>
    supabase
      .from("businesses_view")
      .select(BIZ_CATEGORY_SELECT)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .eq("is_storefront", true)
      .eq("is_explorable", true)
      .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (place.source === "area") {
    const { data: byColumn } = await browseQuery().eq("area_id", place.id).limit(cap);
    mergeCategoryBusinessRows((byColumn as Record<string, unknown>[]) ?? [], byId);

    const { data: links } = await supabase
      .from("area_businesses")
      .select("business_id")
      .eq("area_id", place.id);
    const ids = (links ?? [])
      .map((l) => (l as { business_id: string }).business_id)
      .filter(Boolean);
    if (ids.length > 0) {
      const { data: fromJoin } = await browseQuery().in("id", ids).limit(cap);
      mergeCategoryBusinessRows((fromJoin as Record<string, unknown>[]) ?? [], byId);
    }
  } else {
    if (place.parent_area_id && place.town_id) {
      const { data: wide } = await browseQuery()
        .or(`area_id.eq.${place.parent_area_id},town_id.eq.${place.town_id}`)
        .limit(cap);
      mergeCategoryBusinessRows((wide as Record<string, unknown>[]) ?? [], byId);
    } else if (place.parent_area_id) {
      const { data: byA } = await browseQuery().eq("area_id", place.parent_area_id).limit(cap);
      mergeCategoryBusinessRows((byA as Record<string, unknown>[]) ?? [], byId);
    } else if (place.town_id) {
      const { data: byT } = await browseQuery().eq("town_id", place.town_id).limit(cap);
      mergeCategoryBusinessRows((byT as Record<string, unknown>[]) ?? [], byId);
    }

    if (place.parent_area_id) {
      const { data: links } = await supabase
        .from("area_businesses")
        .select("business_id")
        .eq("area_id", place.parent_area_id);
      const ids = (links ?? [])
        .map((l) => (l as { business_id: string }).business_id)
        .filter(Boolean);
      if (ids.length > 0) {
        const { data: fromJoin } = await browseQuery().in("id", ids).limit(cap);
        mergeCategoryBusinessRows((fromJoin as Record<string, unknown>[]) ?? [], byId);
      }
    }
  }

  return groupBusinessesIntoBrowseSections(
    [...byId.values()].map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      hero_image_url: b.hero_image_url,
      ai_one_liner: b.ai_one_liner,
      ai_summary: b.ai_summary,
      categorySlug: b.categorySlug,
    })),
  );
}
