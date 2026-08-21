import type { SupabaseClient } from "@supabase/supabase-js";
import { nameSimilarity } from "@/lib/admin/duplicate-detection";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import type { BusinessIrseInput } from "../inputs";

type BizRow = {
  id: string;
  slug: string | null;
  title: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: unknown;
  excerpt: string | null;
  content: string | null;
  overview: string | null;
  seo_title: string | null;
  seo_description: string | null;
  town_id: string | number | null;
  area_id: string | number | null;
  primary_category_id: string | number | null;
  map_lat: number | null;
  map_lng: number | null;
  hero_image: string | null;
  main_image: string | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  claim_status: string | null;
  status: string | null;
  is_hidden_from_search: boolean | null;
  date_updated: string | null;
  published_at: string | null;
  towns?: { title: string | null; slug: string | null } | null;
  areas?: { slug: string | null } | null;
  business_categories?: { slug: string | null } | null;
};

export async function loadBusinessIrseInput(
  supabase: SupabaseClient,
  slug: string,
): Promise<BusinessIrseInput | null> {
  const key = slug.trim();
  const { data, error } = await supabase
    .from("businesses_view")
    .select(
      `
      id, slug, title, address, phone, website, hours,
      excerpt, content, overview, seo_title, seo_description,
      town_id, area_id, primary_category_id, map_lat, map_lng,
      hero_image, main_image, hero_image_url, main_image_url,
      claim_status, status, is_hidden_from_search, date_updated, published_at,
      towns ( title, slug ),
      areas ( slug ),
      business_categories!primary_category_id ( slug )
    `,
    )
    .eq("slug", key)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as BizRow;

  const [linked_from_area, similar_count, guide_count, likely_duplicate] = await Promise.all([
    areaLinksBusiness(supabase, row),
    countSimilar(supabase, row),
    countGuideLinks(supabase, row.id),
    detectLikelyDuplicate(supabase, row),
  ]);

  return {
    kind: "business",
    slug: row.slug ?? key,
    title: row.title,
    address: row.address,
    phone: row.phone,
    website: row.website,
    hours: formatHours(row.hours),
    excerpt: row.excerpt,
    content: row.content,
    overview: row.overview,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    town_id: row.town_id,
    town_slug: row.towns?.slug ?? null,
    town_title: row.towns?.title ?? null,
    area_id: row.area_id,
    area_slug: row.areas?.slug ?? null,
    primary_category_id: row.primary_category_id,
    category_slug: row.business_categories?.slug ?? null,
    map_lat: row.map_lat,
    map_lng: row.map_lng,
    hero_image: row.hero_image,
    main_image: row.main_image,
    hero_image_url: row.hero_image_url,
    main_image_url: row.main_image_url,
    claim_status: row.claim_status,
    status: row.status,
    is_hidden_from_search: row.is_hidden_from_search,
    date_updated: row.date_updated,
    published_at: row.published_at,
    // Town hubs list businesses by town_id; presence implies hub eligibility.
    linked_from_town: row.town_id != null,
    linked_from_category: row.primary_category_id != null,
    linked_from_guide: guide_count > 0,
    linked_from_area,
    similar_count,
    guide_count,
    likely_duplicate,
  };
}

function formatHours(hours: unknown): string | null {
  if (typeof hours === "string") return hours;
  if (hours == null) return null;
  try {
    return JSON.stringify(hours);
  } catch {
    return String(hours);
  }
}

async function areaLinksBusiness(supabase: SupabaseClient, row: BizRow): Promise<boolean> {
  if (row.area_id != null) return true;
  const { count } = await supabase
    .from("area_businesses")
    .select("area_id", { count: "exact", head: true })
    .eq("business_id", row.id);
  return (count ?? 0) > 0;
}

async function countGuideLinks(supabase: SupabaseClient, businessId: string): Promise<number> {
  const { count } = await supabase
    .from("guide_businesses")
    .select("guide_id", { count: "exact", head: true })
    .eq("business_id", businessId);
  return count ?? 0;
}

async function countSimilar(supabase: SupabaseClient, row: BizRow): Promise<number> {
  if (row.town_id == null || row.primary_category_id == null) return 0;
  const { count } = await supabase
    .from("businesses_view")
    .select("id", { count: "exact", head: true })
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .is("archived_at", null)
    .eq("town_id", row.town_id)
    .eq("primary_category_id", row.primary_category_id)
    .neq("id", row.id);
  return count ?? 0;
}

async function detectLikelyDuplicate(supabase: SupabaseClient, row: BizRow): Promise<boolean> {
  if (!row.title?.trim() || row.town_id == null) return false;
  const { data } = await supabase
    .from("businesses_view")
    .select("id, title, map_lat, map_lng")
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("town_id", row.town_id)
    .neq("id", row.id)
    .limit(40);
  for (const other of data ?? []) {
    const sim = nameSimilarity(row.title, (other as { title: string | null }).title ?? "");
    if (sim >= 0.92) return true;
  }
  return false;
}
