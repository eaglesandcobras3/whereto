import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { TownCard } from "@/components/discovery/TownCard";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";

export const revalidate = 3600;

export const metadata: Metadata = {
  ...canonicalAlternates("/towns"),
  title: "30A Beach Towns | Florida's Emerald Coast Communities",
  description:
    "Explore the beach communities along Scenic 30A in South Walton, Florida — from Rosemary Beach and Seaside to Alys Beach, Watercolor, and Inlet Beach. Each town has its own feel, pace, and local character.",
  keywords: [
    "30A beach towns",
    "South Walton communities",
    "Rosemary Beach",
    "Seaside Florida",
    "Alys Beach",
    "WaterColor 30A",
    "Inlet Beach",
    "Grayton Beach",
    "30A Florida neighborhoods",
    "Emerald Coast towns",
  ],
  ...openGraphForPage({
    path: "/towns",
    title: "30A Beach Towns | Florida's Emerald Coast Communities | WhereTo30A",
    description:
      "Every beach community along Scenic 30A — with local guides covering vibe, restaurants, beaches, and who each town is best for.",
  }),
};

type TownRow = {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

async function getTowns(): Promise<TownRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns_view")
    .select("id, title, slug, excerpt, main_image, hero_image, main_image_url, hero_image_url, is_featured_destination, featured, sort")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("is_featured_destination", { ascending: false, nullsFirst: true })
    .order("featured", { ascending: false, nullsFirst: true })
    .order("sort", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (error) {
    console.error("towns hub: towns query", error);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const heroUrl = getPublicImageUrlWithView(
        r.main_image_url as string | null,
        r.hero_image_url as string | null,
        r.main_image as string | null,
        r.hero_image as string | null,
      );
      return {
        id: String(r.id),
        name: String((r as { title: string }).title),
        slug: String(r.slug),
        subtitle: (r.excerpt as string | null) ?? null,
        hero_image_url: heroUrl,
      };
    })
    .filter((t) => t.slug && !isReservedRootSlug(t.slug));
}

export default async function TownsPage() {
  const towns = await getTowns();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero */}
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <header className="space-y-4 text-center">
            <p className="text-eyebrow">30A · South Walton, Florida</p>
            <h1 className="text-hero text-[var(--color-text-primary)]">
              Beach towns along 30A
            </h1>
            <p className="mx-auto max-w-xl text-lg text-[var(--color-text-secondary)]">
              Each community on Scenic Highway 30A has its own feel — pick the one that matches how you want the week to go.
            </p>
          </header>
        </div>
      </div>

      {/* Town grid */}
      <div className="mx-auto max-w-6xl px-4 py-12">
        {towns.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)]">
            No towns are available right now. Check back soon.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {towns.map((t) => (
              <TownCard
                key={t.slug}
                name={t.name}
                slug={t.slug}
                subtitle={t.subtitle ?? getTownDescriptor(t.slug)}
                imageUrl={t.hero_image_url}
                analyticsCategory="towns_hub"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
