import { getServiceSupabase } from "@/lib/supabase/service-role";
import { firstPlacePhotoProxyUrl } from "@/lib/media/place-photo";

export type HomeFeaturedBusiness = {
  id: string;
  slug: string;
  name: string;
  ai_summary: string | null;
  tagSlugs: string[];
  /** Proxied Places photo URL or null. */
  image_url: string | null;
};

function tagSlugsFromRow(
  business_tags:
    | { tags: { slug: string } | { slug: string }[] | null }[]
    | null
    | undefined,
): string[] {
  const out: string[] = [];
  for (const bt of business_tags ?? []) {
    const t = bt.tags;
    if (!t) continue;
    if (Array.isArray(t)) {
      for (const x of t) {
        if (x?.slug) out.push(x.slug);
      }
    } else if (typeof t === "object" && "slug" in t && t.slug) {
      out.push(t.slug);
    }
  }
  return [...new Set(out)];
}

function mapRow(row: {
  id: string;
  slug: string;
  name: string;
  ai_summary: string | null;
  google_photos?: string[] | null;
  business_tags?: Parameters<typeof tagSlugsFromRow>[0];
}): HomeFeaturedBusiness {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ai_summary: row.ai_summary,
    tagSlugs: tagSlugsFromRow(row.business_tags),
    image_url: firstPlacePhotoProxyUrl(row.google_photos ?? null),
  };
}

const selectCols = `
  id,
  slug,
  name,
  ai_summary,
  google_photos,
  business_tags(tags(slug))
`;

export async function getHomeFeaturedStrips(): Promise<{
  popular: HomeFeaturedBusiness[];
  restaurants: HomeFeaturedBusiness[];
  coffee: HomeFeaturedBusiness[];
  activities: HomeFeaturedBusiness[];
}> {
  const empty = {
    popular: [] as HomeFeaturedBusiness[],
    restaurants: [] as HomeFeaturedBusiness[],
    coffee: [] as HomeFeaturedBusiness[],
    activities: [] as HomeFeaturedBusiness[],
  };
  try {
    const supabase = getServiceSupabase();
    const { data: cats } = await supabase
      .from("categories")
      .select("id, slug")
      .in("slug", ["restaurants", "coffee_shops", "activities"]);

    const catId: Record<string, number> = {};
    for (const c of cats ?? []) {
      catId[c.slug as string] = c.id as number;
    }

    const base = () =>
      supabase
        .from("businesses")
        .select(selectCols)
        .eq("status", "active")
        .eq("admin_suppressed", false)
        .eq("suspected_closed", false)
        .gte("confidence_score", 0.35);

    const [popularRes, restRes, coffeeRes, actRes] = await Promise.all([
      base()
        .order("total_saves", { ascending: false })
        .order("total_clicks", { ascending: false })
        .limit(12),
      catId.restaurants != null
        ? base()
            .eq("category_id", catId.restaurants)
            .order("engagement_score", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: null }),
      catId.coffee_shops != null
        ? base()
            .eq("category_id", catId.coffee_shops)
            .order("engagement_score", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: null }),
      catId.activities != null
        ? base()
            .eq("category_id", catId.activities)
            .order("engagement_score", { ascending: false })
            .limit(12)
        : Promise.resolve({ data: null }),
    ]);

    return {
      popular: (popularRes.data ?? []).map(mapRow),
      restaurants: (restRes.data ?? []).map(mapRow),
      coffee: (coffeeRes.data ?? []).map(mapRow),
      activities: (actRes.data ?? []).map(mapRow),
    };
  } catch {
    return empty;
  }
}

/** Spotlight towns for home quick nav (order preserved). */
export const HOME_TOWN_SPOTLIGHT_SLUGS = [
  "rosemary-beach",
  "seaside",
  "alys-beach",
  "grayton-beach",
] as const;
