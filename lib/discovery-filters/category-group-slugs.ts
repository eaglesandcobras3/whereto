import {
  BUSINESS_CATEGORY_GROUP_SLUGS,
  businessCategoryGroupForSlug,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import {
  SERVICE_CATEGORY_GROUP_SLUGS,
  serviceCategoryGroupForSlug,
} from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { normalizeServiceCategorySlug } from "@/lib/service-categories/normalize";

function normalizeSlugKey(slug: string): string {
  return slug.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/** Map URL `category` param to a storefront browse group slug. */
export function normalizeStorefrontCategoryGroupSlug(
  slug: string | null | undefined,
): BusinessCategoryGroupSlug | undefined {
  if (!slug?.trim()) return undefined;
  const key = normalizeSlugKey(slug);
  if ((BUSINESS_CATEGORY_GROUP_SLUGS as readonly string[]).includes(key)) {
    return key as BusinessCategoryGroupSlug;
  }
  const granular = normalizeBusinessCategorySlug(slug);
  if (!granular) return undefined;
  return businessCategoryGroupForSlug(granular) ?? undefined;
}

/** Map URL `service_category` param to a service browse group slug. */
export function normalizeServiceCategoryGroupSlug(
  slug: string | null | undefined,
): (typeof SERVICE_CATEGORY_GROUP_SLUGS)[number] | undefined {
  if (!slug?.trim()) return undefined;
  const key = normalizeSlugKey(slug);
  if ((SERVICE_CATEGORY_GROUP_SLUGS as readonly string[]).includes(key)) {
    return key as (typeof SERVICE_CATEGORY_GROUP_SLUGS)[number];
  }
  const granular = normalizeServiceCategorySlug(slug);
  if (!granular) return undefined;
  return serviceCategoryGroupForSlug(granular as ServiceCategorySlug) ?? undefined;
}
