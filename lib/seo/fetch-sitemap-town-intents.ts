import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getTownIntentSectionsForTown } from "@/lib/data/town-category-sections";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export async function fetchSitemapTownIntentRows(
  supabase: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const { data: towns } = await supabase
    .from("towns")
    .select("id, slug, date_updated, published_at, date_created")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS);

  const out: Record<string, unknown>[] = [];

  for (const row of (towns ?? []) as Array<Record<string, unknown>>) {
    const townId = String(row.id ?? "").trim();
    const townSlug = String(row.slug ?? "").trim();
    if (!townId || !townSlug) continue;

    const { rollupSections, leafSections } = await getTownIntentSectionsForTown(townId);
    const seen = new Set<string>();

    for (const section of [...rollupSections, ...leafSections]) {
      if (!section.slug || section.businesses.length === 0) continue;
      if (seen.has(section.slug)) continue;
      seen.add(section.slug);
      out.push({
        town_slug: townSlug,
        seo_slug: section.slug,
        date_updated: row.date_updated,
        published_at: row.published_at,
        date_created: row.date_created,
      });
    }
  }

  return out;
}
