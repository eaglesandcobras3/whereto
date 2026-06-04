import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { normalizeServiceCategorySlug } from "@/lib/service-categories/normalize";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export const SERVICE_VENDORS_PAGE_SIZE = 24;

export type ServiceCategoryRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  vendor_count: number;
};

export type ServiceVendorRow = {
  id: string;
  slug: string;
  name: string;
  excerpt: string | null;
  hero_image_url: string | null;
  town_name: string | null;
  service_category_slug: string | null;
  service_category_title: string | null;
};

export type ServiceVendorsPageResult = {
  vendors: ServiceVendorRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: ServiceCategoryRow[];
  activeCategory: ServiceCategoryRow | null;
  query: string;
};

function vendorBaseQuery() {
  return getServiceSupabase()
    .from("businesses_view")
    .select(
      "id, slug, title, excerpt, main_image, hero_image, main_image_url, hero_image_url, service_category_slug, service_category_title, towns ( title )",
      { count: "exact" },
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);
}

function mapVendorRow(row: Record<string, unknown>): ServiceVendorRow {
  const town = row.towns as { title?: string } | null;
  const heroUrl = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String((row as { title: string }).title),
    excerpt: (row.excerpt as string | null) ?? null,
    hero_image_url: heroUrl,
    town_name: town?.title ?? null,
    service_category_slug: (row.service_category_slug as string | null) ?? null,
    service_category_title: (row.service_category_title as string | null) ?? null,
  };
}

export async function listServiceCategories(): Promise<ServiceCategoryRow[]> {
  const supabase = getServiceSupabase();
  const { data: cats, error } = await supabase
    .from("service_categories")
    .select("id, title, slug, excerpt, sort")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .order("sort", { ascending: true });

  if (error) {
    console.error("service categories list", error);
    return [];
  }

  const { data: vendors } = await getServiceSupabase()
    .from("businesses_view")
    .select("service_category_id")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  const counts = new Map<string, number>();
  for (const row of vendors ?? []) {
    const id = String((row as { service_category_id: string | null }).service_category_id ?? "");
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return (cats ?? []).map((c) => {
    const r = c as { id: string; title: string; slug: string; excerpt: string | null };
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      vendor_count: counts.get(r.id) ?? 0,
    };
  });
}

export async function getServiceCategoryBySlug(
  slug: string,
): Promise<ServiceCategoryRow | null> {
  const normalized = normalizeServiceCategorySlug(slug);
  if (!normalized) return null;
  const categories = await listServiceCategories();
  return categories.find((c) => c.slug === normalized) ?? null;
}

export async function getServiceVendorsPage(input: {
  page?: number;
  /** `service_categories.slug` (user-facing "specialty"). */
  specialtySlug?: string | null;
  /** @deprecated Use `specialtySlug`. */
  serviceCategorySlug?: string | null;
  query?: string | null;
}): Promise<ServiceVendorsPageResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = SERVICE_VENDORS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const trimmedQ = input.query?.trim() ?? "";

  const categories = await listServiceCategories();
  const specialtySlug = input.specialtySlug ?? input.serviceCategorySlug;
  const activeCategory = specialtySlug ? await getServiceCategoryBySlug(specialtySlug) : null;

  let q = vendorBaseQuery();

  if (activeCategory) {
    q = q.eq("service_category_id", activeCategory.id);
  }

  if (trimmedQ) {
    const safe = trimmedQ.replace(/[%_,\\]/g, " ").trim();
    if (safe) {
      q = q.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%,search_keywords.ilike.%${safe}%`);
    }
  }

  const { data, error, count } = await q
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("service vendors page", error);
    return {
      vendors: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      categories,
      activeCategory,
      query: trimmedQ,
    };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    vendors: (data ?? []).map((row) => mapVendorRow(row as Record<string, unknown>)),
    totalCount,
    page,
    pageSize,
    totalPages,
    categories,
    activeCategory,
    query: trimmedQ,
  };
}

export async function countServiceVendors(): Promise<number> {
  const { count, error } = await getServiceSupabase()
    .from("businesses_view")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);
  if (error) {
    console.error("service vendors hub: count query", error);
    return 0;
  }
  return count ?? 0;
}
