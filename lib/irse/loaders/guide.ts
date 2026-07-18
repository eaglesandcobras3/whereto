import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuideIrseInput } from "../inputs";

type GuideRow = {
  id: string;
  slug: string | null;
  title: string | null;
  guide_type: string | null;
  content: string | null;
  summary: string | null;
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  hero_image: string | null;
  main_image: string | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  status: string | null;
  published_at: string | null;
  date_updated: string | null;
  search_tags: string[] | null;
};

export async function loadGuideIrseInput(
  supabase: SupabaseClient,
  slug: string,
): Promise<GuideIrseInput | null> {
  const key = slug.trim();
  const { data, error } = await supabase
    .from("guides")
    .select(
      `
      id, slug, title, guide_type, content, summary, excerpt,
      seo_title, seo_description, og_title, og_description,
      hero_image, main_image, hero_image_url, main_image_url,
      status, published_at, date_updated, search_tags
    `,
    )
    .eq("slug", key)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as GuideRow;

  const [town_link_count, area_link_count, business_link_count] = await Promise.all([
    countJunction(supabase, "guide_towns", "guide_id", row.id),
    countJunction(supabase, "guide_areas", "guide_id", row.id),
    countJunction(supabase, "guide_businesses", "guide_id", row.id),
  ]);

  return {
    kind: "guide",
    slug: row.slug ?? key,
    title: row.title,
    guide_type: row.guide_type,
    content: row.content,
    summary: row.summary,
    excerpt: row.excerpt,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    og_title: row.og_title,
    og_description: row.og_description,
    hero_image: row.hero_image,
    main_image: row.main_image,
    hero_image_url: row.hero_image_url,
    main_image_url: row.main_image_url,
    status: row.status,
    published_at: row.published_at,
    date_updated: row.date_updated,
    town_link_count,
    area_link_count,
    business_link_count,
    search_tags_count: Array.isArray(row.search_tags) ? row.search_tags.length : 0,
  };
}

async function countJunction(
  supabase: SupabaseClient,
  table: string,
  column: string,
  id: string,
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select(column, { count: "exact", head: true })
    .eq(column, id);
  return count ?? 0;
}
