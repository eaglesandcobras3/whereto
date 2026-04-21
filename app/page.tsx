import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { BusinessPayload } from "@/lib/search/types";
import { getHomeHeroSettings } from "@/lib/data/site-settings";

export default async function Home() {
  const flags = await getAllFeatureFlags();
  const heroSettings = await getHomeHeroSettings();
  const supabase = getServiceSupabase();

  // Fetch towns for the homepage town section; prefer curated town spotlights from featured_content.
  let towns:
    | {
        name: string;
        slug: string;
        ai_tagline: string | null;
        ai_description: string | null;
      }[]
    | null = null;

  const { data: featuredTownRows } = await supabase
    .from("featured_content")
    .select("reference_id")
    .eq("content_type", "town")
    .eq("is_active", true)
    .order("sort_order")
    .limit(12);

  const featuredTownIds = (featuredTownRows ?? [])
    .map((row) => Number(row.reference_id))
    .filter((id) => Number.isFinite(id));

  if (featuredTownIds.length > 0) {
    const { data: featuredTowns } = await supabase
      .from("towns")
      .select("id, name, slug, ai_tagline, ai_description")
      .in("id", featuredTownIds);

    const byId = new Map((featuredTowns ?? []).map((t) => [Number(t.id), t]));
    towns = featuredTownIds
      .map((id) => byId.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => ({
        name: t.name as string,
        slug: t.slug as string,
        ai_tagline: (t.ai_tagline as string | null) ?? null,
        ai_description: (t.ai_description as string | null) ?? null,
      }));
  }

  if (!towns || towns.length === 0) {
    const { data: fallbackTowns } = await supabase
      .from("towns")
      .select("name, slug, ai_tagline, ai_description")
      .order("name")
      .limit(6);
    towns = fallbackTowns ?? [];
  }

  let featuredBusinesses: (BusinessPayload & {
    featured_title?: string | null;
    featured_description?: string | null;
    badge?: string | null;
  })[] = [];
  if (flags["featured_business"]) {
    // First try to get from featured_content table
    const { data: featured } = await supabase
      .from("featured_content")
      .select("reference_id, title, description, badge")
      .eq("content_type", "business")
      .eq("is_active", true)
      .order("sort_order")
      .limit(10);

    if (featured && featured.length > 0) {
      // Get the actual business data for featured items
      const businessIds = featured.map((f) => f.reference_id).filter(Boolean);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, slug, hero_image_url, ai_summary")
        .in("id", businessIds);

      const bizMap = new Map((businesses ?? []).map((b) => [b.id, b]));
      featuredBusinesses = featured
        .map((f) => {
          const biz = bizMap.get(f.reference_id);
          if (!biz) return null;
          return {
            ...biz,
            featured_title: f.title,
            featured_description: f.description,
            badge: f.badge,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
    }

    // Fallback: if no featured content, get top businesses by score
    if (featuredBusinesses.length === 0) {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, hero_image_url, ai_summary, status")
        .eq("status", "active")
        .order("confidence_score", { ascending: false })
        .limit(10);
      featuredBusinesses = data ?? [];
    }
  }

  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" aria-hidden />}
    >
      <HomePage
        featureFlags={flags}
        featuredBusinesses={featuredBusinesses}
        towns={towns ?? []}
        heroSettings={heroSettings}
      />
    </Suspense>
  );
}
