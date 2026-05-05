import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { BusinessPayload } from "@/lib/search/types";
import { getHomeHeroSettings } from "@/lib/data/site-settings";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { pickDailySubset } from "@/lib/home/daily-featured-pick";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";

/** Fresh `Date` each request so daily featured picks advance. Shuffle seed uses `America/Chicago` calendar dates. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...canonicalAlternates("/"),
};

export default async function Home() {
  const flags = await getAllFeatureFlags();
  const heroSettings = await getHomeHeroSettings();
  const supabase = getServiceSupabase();

  const { data: townRows, error: townErr } = await supabase
    .from("towns_view")
    .select("id, title, slug, excerpt, content, main_image, hero_image, main_image_url, hero_image_url, is_featured_destination, featured, status, sort")
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("is_featured_destination", { ascending: false, nullsFirst: true })
    .order("featured", { ascending: false, nullsFirst: true })
    .order("sort", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(12);

  if (townErr) {
    console.error("home: towns query", townErr);
  }

  const townList = (townRows ?? [])
    .map((t) => {
      const r = t as {
        title: string;
        slug: string;
        excerpt?: string | null;
        content?: string | null;
        main_image?: string | null;
        hero_image?: string | null;
        main_image_url?: string | null;
        hero_image_url?: string | null;
      };
      return {
        name: r.title,
        slug: r.slug,
        ai_tagline: null as string | null,
        ai_description: (r.excerpt ?? r.content) ?? null,
        hero_image_url: getPublicImageUrlWithView(
          r.main_image_url,
          r.hero_image_url,
          r.main_image,
          r.hero_image,
        ),
      };
    })
    .filter((t) => t.slug);

  let featuredBusinesses: (BusinessPayload & {
    featured_title?: string | null;
    featured_description?: string | null;
    badge?: string | null;
  })[] = [];

  if (flags["featured_business"]) {
    const { data: businessRows, error: bizErr } = await supabase
      .from("businesses_view")
      .select("id, title, slug, excerpt, main_image, hero_image, main_image_url, hero_image_url, content, featured, sort, date_updated")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("sort", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
      .order("id", { ascending: true })
      .limit(150);

    if (bizErr) {
      console.error("home: businesses query", bizErr);
    }

    const dailyPicks = pickDailySubset(businessRows ?? [], 8);

    featuredBusinesses = dailyPicks.map((b) => {
      const row = b as {
        id: string;
        title: string;
        slug: string;
        excerpt?: string | null;
        main_image?: string | null;
        hero_image?: string | null;
        main_image_url?: string | null;
        hero_image_url?: string | null;
        content?: string | null;
      };
      const img = getPublicImageUrlWithView(
        row.main_image_url,
        row.hero_image_url,
        row.main_image,
        row.hero_image,
      );
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
