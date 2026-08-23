import Link from "next/link";
import type { Metadata } from "next";
import { AreaCard } from "@/components/discovery/AreaCard";
import { BusinessMapSection } from "@/components/maps/BusinessMapSection";
import { listAreasForAreasHub } from "@/lib/data/areas-hub-list";
import { listAreaHubMapMarkers } from "@/lib/data/place-map-markers";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { hubAreasIntro } from "@/lib/seo/page-intro-copy";
import { CollapsibleText } from "@/components/ui/collapsible-text";
import { getAllFeatureFlags, isTownMapsFeatureEnabled } from "@/lib/feature-flags";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";

export const revalidate = 21600;

export const metadata: Metadata = {
  ...canonicalAlternates("/areas"),
  title: "30A Town Centers & Shopping Districts",
  description:
    "Explore the town centers, shopping districts, and local gathering spots along Scenic 30A, from Rosemary Beach Town Center and Seaside to Alys Beach and WaterColor's MarketShops.",
  keywords: [
    "30A town centers",
    "30A shopping districts",
    "Rosemary Beach Town Center",
    "Seaside Florida shops",
    "Alys Beach town center",
    "30A local areas",
    "South Walton districts",
    "30A landmarks",
  ],
  ...openGraphForPage({
    path: "/areas",
    title: "30A Town Centers & Shopping Districts | WhereTo30A",
    description:
      "Every notable area, district, and gathering spot along 30A, curated with local restaurants, shops, and things to do nearby.",
  }),
};

export default async function AreasPage() {
  const areas = await listAreasForAreasHub();
  const flags = await getAllFeatureFlags();
  const townMapsEnabled = isTownMapsFeatureEnabled(flags);

  let mapMarkers: BusinessMapMarker[] = [];
  if (townMapsEnabled && areas.length > 0) {
    try {
      mapMarkers = await listAreaHubMapMarkers(areas);
    } catch (err) {
      console.error("areas hub map markers", err);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero — matches /towns */}
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 md:px-10">
          <header className="max-w-3xl space-y-3">
            <p className="text-eyebrow">30A · South Walton, Florida</p>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl md:text-4xl">
              Districts &amp; town centers
            </h1>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
              The shopping districts, town centers, and local gathering spots that give each
              30A community its character.
            </p>
            <CollapsibleText
              text={hubAreasIntro()}
              className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]"
            />
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:px-10">
        {mapMarkers.length > 0 ? (
          <BusinessMapSection
            markers={mapMarkers}
            title="Map of districts & town centers"
            description="Areas with a mapped center along Scenic Highway 30A."
            zoom={14}
            fitMaxZoom={14}
          />
        ) : null}

        {areas.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)]">No areas found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <AreaCard
                key={area.slug}
                name={area.name}
                slug={area.slug}
                subtitle={area.subtitle ?? undefined}
                imageUrl={area.hero_image_url}
                analyticsCategory="areas_hub"
              />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
            Explore by town
          </h2>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            Every 30A community has its own character. Find restaurants, shops, and local guides
            for each one.
          </p>
          <Link
            href="/towns"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
          >
            <span className="material-symbols-outlined !text-base">beach_access</span>
            Browse all towns
          </Link>
        </div>
      </section>
    </div>
  );
}
