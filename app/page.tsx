import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { BusinessPayload } from "@/lib/search/types";
import { getHomeHeroSettings } from "@/lib/data/site-settings";
import { getPublicImageUrl } from "@/lib/media/public-image-url";

export default async function Home() {
  const flags = await getAllFeatureFlags();
  const heroSettings = await getHomeHeroSettings();
  const supabase = getServiceSupabase();

  const { data: featuredTowns } = await supabase
    .from("towns")
    .select("id, title, slug, excerpt, content, main_image, hero_image, is_featured_destination, status")
    .in("status", ["published", "active"])
    .or("is_featured_destination.eq.true,featured.eq.true")
    .order("sort", { ascending: true, nullsFirst: false })
    .limit(12);

  const towns = (featuredTowns ?? [])
    .map((t) => {
      const main = (t as { main_image?: string | null }).main_image;
      const hero = (t as { hero_image?: string | null }).hero_image;
      return {
        name: (t as { title: string }).title,
        slug: t.slug,
        ai_tagline: null as string | null,
        ai_description: ((t as { excerpt?: string | null }).excerpt ?? (t as { content?: string | null }).content) ?? null,
        hero_image_url: getPublicImageUrl(hero) ?? getPublicImageUrl(main) ?? null,
      };
    })
    .filter((t) => t.slug);

  const townList =
    towns.length > 0
      ? towns
      : (
          await supabase
            .from("towns")
            .select("title, slug, excerpt, content, main_image, hero_image")
            .in("status", ["published", "active"])
            .order("title")
            .limit(6)
        ).data?.map((t) => ({
          name: (t as { title: string }).title,
          slug: t.slug as string,
          ai_tagline: null as string | null,
          ai_description: (t as { excerpt?: string | null }).excerpt ?? (t as { content?: string | null }).content ?? null,
          hero_image_url:
            getPublicImageUrl((t as { hero_image?: string | null }).hero_image) ??
            getPublicImageUrl((t as { main_image?: string | null }).main_image) ??
            null,
        })) ?? [];

  let featuredBusinesses: (BusinessPayload & {
    featured_title?: string | null;
    featured_description?: string | null;
    badge?: string | null;
  })[] = [];

  if (flags["featured_business"]) {
    const { data: featuredRows } = await supabase
      .from("businesses")
      .select("id, title, slug, excerpt, main_image, hero_image, content")
      .in("status", ["published", "active"])
      .or("featured.eq.true")
      .order("sort", { ascending: true, nullsFirst: false })
      .limit(10);

    if (featuredRows && featuredRows.length > 0) {
      featuredBusinesses = featuredRows.map((b) => {
        const row = b as { id: string; title: string; slug: string; excerpt?: string | null; main_image?: string | null; hero_image?: string | null; content?: string | null };
        const img = getPublicImageUrl(row.main_image) ?? getPublicImageUrl(row.hero_image);
        return {
          id: row.id,
          name: row.title,
          slug: row.slug,
          ai_summary: row.excerpt ?? row.content?.slice(0, 500) ?? null,
          hero_image_url: img,
          image_url: img,
        };
      });
    }

    if (featuredBusinesses.length === 0) {
      const { data: fallback } = await supabase
        .from("businesses")
        .select("id, title, slug, excerpt, main_image, hero_image, content")
        .in("status", ["published", "active"])
        .order("date_updated", { ascending: false, nullsFirst: false })
        .limit(10);
      featuredBusinesses = (fallback ?? []).map((b) => {
        const row = b as { id: string; title: string; slug: string; excerpt?: string | null; main_image?: string | null; hero_image?: string | null; content?: string | null };
        const img = getPublicImageUrl(row.main_image) ?? getPublicImageUrl(row.hero_image);
        return {
          id: row.id,
          name: row.title,
          slug: row.slug,
          ai_summary: row.excerpt ?? row.content?.slice(0, 500) ?? null,
          hero_image_url: img,
          image_url: img,
        };
      });
    }
  }

  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" aria-hidden />}
    >
      <HomePage
        featureFlags={flags}
        featuredBusinesses={featuredBusinesses}
        towns={townList}
        heroSettings={heroSettings}
      />
    </Suspense>
  );
}
