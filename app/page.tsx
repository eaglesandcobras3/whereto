import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { BusinessPayload } from "@/lib/search/types";
import { getHomeHeroSettings } from "@/lib/data/site-settings";
import { getPublicImageUrl } from "@/lib/media/public-image-url";
import { storefrontListingStatuses } from "@/lib/shop/public-listing-filters";

export default async function Home() {
  const flags = await getAllFeatureFlags();
  const heroSettings = await getHomeHeroSettings();
  const supabase = getServiceSupabase();
  const listableStatus = storefrontListingStatuses();

  const { data: townRows, error: townErr } = await supabase
    .from("towns")
    .select("id, title, slug, excerpt, content, main_image, hero_image, is_featured_destination, featured, status, sort")
    .in("status", listableStatus)
    .is("archived_at", null)
    .or("is_hidden_from_search.is.null,is_hidden_from_search.eq.false")
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

  let featuredBusinesses: (BusinessPayload & {
    featured_title?: string | null;
    featured_description?: string | null;
    badge?: string | null;
  })[] = [];

  if (flags["featured_business"]) {
    const { data: businessRows, error: bizErr } = await supabase
      .from("businesses")
      .select("id, title, slug, excerpt, main_image, hero_image, content, featured, sort, date_updated")
      .in("status", listableStatus)
      .is("archived_at", null)
      .or("is_hidden_from_search.is.null,is_hidden_from_search.eq.false")
      .order("featured", { ascending: false, nullsFirst: true })
      .order("sort", { ascending: true, nullsFirst: false })
      .order("date_updated", { ascending: false, nullsFirst: false })
      .limit(10);

    if (bizErr) {
      console.error("home: businesses query", bizErr);
    }

    featuredBusinesses = (businessRows ?? []).map((b) => {
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
