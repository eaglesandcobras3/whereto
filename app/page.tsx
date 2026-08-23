import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { HomeQueryRedirect } from "@/components/home/HomeQueryRedirect";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { BusinessPayload } from "@/lib/search/types";
import { getHomeHeroSettings } from "@/lib/data/site-settings";
import { listTownsForTownsHub } from "@/lib/data/towns-hub-list";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  FEATURED_HAS_IMAGE_OR,
  filterFeaturedListingPool,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { pickDailySubset } from "@/lib/home/daily-featured-pick";
import { homePageMetadata } from "@/lib/seo/hub-metadata";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { listHomepageFeaturedRentals } from "@/lib/stays/execute-search";
import type { RentalPropertyView } from "@/lib/stays/types";

// Daily featured picks use a calendar-date seed (America/Chicago) — they don't change within a day.
// ISR at 1 hour is sufficient; picks rotate at midnight Central regardless of cache timing.
export const revalidate = 21600;

const HOME_DESCRIPTION =
  "Plan your 30A trip with local guides to beach towns, restaurants, shopping, beach access, and Emerald Coast travel tips.";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getHomeHeroSettings();
  return {
    ...homePageMetadata(hero.imageUrl),
    keywords: [
      "30A",
      "30A Florida",
      "Emerald Coast",
      "Rosemary Beach",
      "Seaside Florida",
      "Alys Beach",
      "Grayton Beach",
      "30A restaurants",
      "30A things to do",
      "30A vacation",
      "30A beach towns",
      "Florida panhandle beaches",
    ],
  };
}

export default async function Home() {
  const heroSettings = await getHomeHeroSettings();
  const supabase = getServiceSupabase();

  const hubTowns = await listTownsForTownsHub();
  const townList = hubTowns.map((t) => ({
    name: t.name,
    slug: t.slug,
    ai_tagline: null as string | null,
    ai_description: (t.excerpt ?? t.content) ?? null,
    hero_image_url: t.hero_image_url,
  }));

  let featuredBusinesses: (BusinessPayload & {
    featured_title?: string | null;
    featured_description?: string | null;
    badge?: string | null;
  })[] = [];

  const { data: businessRows, error: bizErr } = await supabase
    .from("businesses_view")
    .select(
      "id, title, slug, excerpt, main_image, hero_image, main_image_url, hero_image_url, content, featured, sort, date_updated",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", false)
    .or(FEATURED_HAS_IMAGE_OR)
    .order("sort", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .order("id", { ascending: true })
    .limit(150);

  if (bizErr) {
    console.error("home: businesses query", bizErr);
  }

  const dailyPicks = pickDailySubset(filterFeaturedListingPool(businessRows ?? []), 8);

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

  let featuredRentals: RentalPropertyView[] = [];
  const flags = await getAllFeatureFlags();
  if (isRentalsFeatureEnabled(flags)) {
    try {
      const rentalFeatured = await listHomepageFeaturedRentals(6);
      featuredRentals = rentalFeatured.items;
    } catch (e) {
      console.error("home: featured rentals", e);
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <HomeQueryRedirect />
      </Suspense>
      <HomePage
        featuredBusinesses={featuredBusinesses}
        featuredRentals={featuredRentals}
        towns={townList}
        heroSettings={heroSettings}
      />
    </>
  );
}
