import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";

export type MarkdownBusinessCardData = {
  slug: string;
  name: string;
  hero_image_url: string | null;
  ai_one_liner: string | null;
  town_name: string | null;
};

export async function fetchBusinessesForMarkdownCards(
  slugs: string[],
): Promise<Record<string, MarkdownBusinessCardData>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (!unique.length) return {};

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("businesses")
    .select("slug, name, hero_image_url, ai_one_liner, towns(name)")
    .eq("status", "active")
    .in("slug", unique);

  if (error || !data) return {};

  const map: Record<string, MarkdownBusinessCardData> = {};
  for (const row of data) {
    const slug = row.slug as string;
    const townsRaw = row.towns as { name: string } | { name: string }[] | null;
    const townObj = Array.isArray(townsRaw) ? townsRaw[0] : townsRaw;
    map[slug] = {
      slug,
      name: row.name as string,
      hero_image_url: (row.hero_image_url as string | null) ?? null,
      ai_one_liner: (row.ai_one_liner as string | null) ?? null,
      town_name: townObj?.name ?? null,
    };
  }
  return map;
}
