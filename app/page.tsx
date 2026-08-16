import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { HomeQueryRedirect } from "@/components/home/HomeQueryRedirect";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { BusinessPayload } from "@/lib/search/types";
import { getHomeHeroSettings } from "@/lib/data/site-settings";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  applyFeaturedListingPoolFilters,
  filterFeaturedListingPool,
  BROWSE_VISIBLE_NOT_HIDDEN,
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

  const { data: townRows, error: townErr } = await supabase
    .from("towns_view")
    .select("id, title, slug, excerpt, content, main_image, hero_image, main_image_url, hero_image_url, is_featured_destination, featured, status, sort")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .order("is_featured_destination", { ascending: false, nullsFirst: true })
    .order("featured", { ascending: false, nullsFirst: true })
    .order("sort", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(200);

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

  const { data: businessRows, error: bizErr } = await applyFeaturedListingPoolFilters(
    supabase
      .from("businesses_view")
      .select(
        "id, title, slug, excerpt, main_image, hero_image, main_image_url, hero_image_url, content, featured, sort, date_updated",
      )
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN),
  )
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
