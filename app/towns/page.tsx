import Image from "next/image";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { TownCard } from "@/components/discovery/TownCard";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { hubTownsIntro } from "@/lib/seo/page-intro-copy";
import { townsHubMetadata } from "@/lib/seo/hub-metadata";
import { CollapsibleText } from "@/components/ui/collapsible-text";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { SeoImprovementsGate } from "@/components/feature-flags/SeoImprovementsGate";
import { generateCollectionPageSchema } from "@/lib/seo/breadcrumb-schema";

export const revalidate = 21600;

export const metadata: Metadata = townsHubMetadata();

type TownRow = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
};

async function getTowns(): Promise<TownRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns_view")
    .select("id, title, slug, main_image, hero_image, main_image_url, hero_image_url, is_featured_destination, featured, sort")
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
        hero_image_url: heroUrl,
      };
    })
    .filter((t) => t.slug && !isReservedRootSlug(t.slug));
}

export default async function TownsPage() {
  const towns = await getTowns();
  const collectionSchema = generateCollectionPageSchema({
    name: "30A Beach Towns",
    path: "/towns",
    description: hubTownsIntro(),
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <SeoImprovementsGate>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      </SeoImprovementsGate>

      {/* Hero */}
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 md:px-10">
          <SeoImprovementsGate>
            <HubBreadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Towns", href: "/towns", current: true },
              ]}
              analyticsCategory="towns_hub_breadcrumb"
            />
          </SeoImprovementsGate>
          <header className="max-w-3xl space-y-3">
            <p className="text-eyebrow">30A · South Walton, Florida</p>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl md:text-4xl">
              Beach towns along 30A
            </h1>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
              Each community on Scenic Highway 30A has its own feel. Pick the one that matches how you want the week to go.
            </p>
            <CollapsibleText
              text={hubTownsIntro()}
              className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]"
            />
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
                subtitle={getTownDescriptor(t.slug)}
                imageUrl={t.hero_image_url}
                analyticsCategory="towns_hub"
              />
            ))}
          </div>
        )}
      </div>

      {/* 30A corridor map */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-10">
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)] sm:text-xl">
            Map of towns along 30A
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            The communities run east to west along Scenic Highway 30A between Inlet Beach and Dune Allen.
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm">
            <Image
              src="/map.jpeg"
              alt="Map of beach towns along Scenic Highway 30A from Inlet Beach to Dune Allen"
              width={1200}
              height={600}
              className="h-auto w-full"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
