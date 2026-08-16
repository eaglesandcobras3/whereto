import { BrowseGroupLeafLinks } from "@/components/browse/BrowseGroupLeafLinks";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubTownSections } from "@/components/browse/CategoryHubTownSections";
import { ListBusinessHomeCta } from "@/components/home/ListBusinessHomeCta";
import { BusinessMapSection } from "@/components/maps/BusinessMapSection";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";
import {
  isUnifiedRollupSlug,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import type { BrowseGroupHubPage, BrowseGroupLeafLink } from "@/lib/data/browse-group-hub";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import { partitionCategoryBusinessesByTown } from "@/lib/data/category-hub";
import type { BusinessCategoryGroupSlug } from "@/lib/business-categories/groups";
import { BROWSE_GROUP_HUB_SAMPLE_LIMIT } from "@/lib/seo/category-hub-constants";

type Props = {
  hub: BrowseGroupHubPage;
  mapMarkers?: BusinessMapMarker[];
  leafLinks?: BrowseGroupLeafLink[];
};

function hubPathFor(slug: string): string {
  if (isUnifiedRollupSlug(slug)) return unifiedRollupHubPath(slug);
  return businessBrowseGroupHubPath(slug as BusinessCategoryGroupSlug);
}

export function BrowseGroupHubView({
  hub,
  mapMarkers = [],
  leafLinks = [],
}: Props) {
  const hubPath = hubPathFor(hub.slug);
  const sampleBusinesses = hub.businesses.slice(0, BROWSE_GROUP_HUB_SAMPLE_LIMIT);
  const { townGroups, regional } = partitionCategoryBusinessesByTown(sampleBusinesses);
  const townCount = partitionCategoryBusinessesByTown(hub.businesses).townGroups.length;

  const itemListSchema = {
    ...generateItemListSchema(
      sampleBusinesses.map((b) => ({
        name: b.name,
        url: `/business/${b.slug}`,
      })),
    ),
    name: `${hub.title} on 30A, Florida`,
    description: `Browse ${hub.title.toLowerCase()} types along Scenic 30A, then open a category hub for the full town grid.`,
    numberOfItems: sampleBusinesses.length,
  };

  const metaParts: string[] = [
    `${hub.businesses.length} ${hub.businesses.length === 1 ? "listing" : "listings"}`,
  ];
  if (townCount > 0) {
    metaParts.push(`${townCount} ${townCount === 1 ? "town" : "towns"}`);
  }
  if (leafLinks.length > 0) {
    metaParts.push(`${leafLinks.length} types`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main className="flex-1">
        <BrowseHubHero
          title={`${hub.title} on 30A`}
          description={
            townCount > 0
              ? `${hub.title} across Scenic Highway 30A — start with a type hub for the full by-town list, or sample featured listings below.`
              : `${hub.title} serving Scenic Highway 30A and South Walton — open a type hub for the full listing grid.`
          }
          collapsibleDescription={`This rollup groups related ${hub.title.toLowerCase()} so you can jump into a specific category (restaurants, coffee, bars, and so on). Full town-by-town browsing lives on those leaf hubs; the sample below is a quick orientation, not the complete directory.`}
          meta={<>{metaParts.join(" · ")}</>}
          breadcrumbs={
            <HubBreadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Businesses", href: "/businesses" },
                { name: hub.title, href: hubPath, current: true },
              ]}
              analyticsCategory="browse_group_hub_breadcrumb"
            />
          }
        />

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:px-10">
          <BrowseGroupLeafLinks leaves={leafLinks} />

          {mapMarkers.length > 0 ? (
            <BusinessMapSection
              markers={mapMarkers}
              title={`Map sample: ${hub.title}`}
              description="A sample of storefronts with a mapped location."
            />
          ) : null}

          <section className="space-y-4" aria-labelledby="browse-group-sample-heading">
            <div>
              <h2
                id="browse-group-sample-heading"
                className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl"
              >
                Featured sample
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Up to {BROWSE_GROUP_HUB_SAMPLE_LIMIT} listings for orientation. Open a type hub
                above for the complete by-town grid.
              </p>
            </div>
            <CategoryHubTownSections
              townGroups={townGroups}
              regional={regional}
              categorySlug={hub.slug}
              emptyMessage={
                <p className="text-[var(--color-text-secondary)]">
                  No listings found for this category yet.
                </p>
              }
              flagEntity="hub"
              pageTitle={hub.title}
            />
          </section>
        </div>

        <ListBusinessHomeCta />
      </main>
    </div>
  );
}
