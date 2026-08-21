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
  /** PostHog `category_hub_seo` — leaf type links + sample grid. */
  seoSubstanceEnabled?: boolean;
  /** Parent crumb for Businesses — Discover when enabled, else categories hub. */
  businessesHref?: string;
};

function hubPathFor(slug: string): string {
  if (isUnifiedRollupSlug(slug)) return unifiedRollupHubPath(slug);
  return businessBrowseGroupHubPath(slug as BusinessCategoryGroupSlug);
}

export function BrowseGroupHubView({
  hub,
  mapMarkers = [],
  leafLinks = [],
  seoSubstanceEnabled = false,
  businessesHref = "/discover",
}: Props) {
  const hubPath = hubPathFor(hub.slug);
  const listingPool = seoSubstanceEnabled
    ? hub.businesses.slice(0, BROWSE_GROUP_HUB_SAMPLE_LIMIT)
    : hub.businesses;
  const { townGroups, regional } = partitionCategoryBusinessesByTown(listingPool);
  const fullTownCount = partitionCategoryBusinessesByTown(hub.businesses).townGroups.length;
  const townCount = seoSubstanceEnabled ? fullTownCount : townGroups.length;

  const itemListSchema = {
    ...generateItemListSchema(
      listingPool.slice(0, 50).map((b) => ({
        name: b.name,
        url: `/business/${b.slug}`,
      })),
    ),
    name: `${hub.title} on 30A, Florida`,
    description: seoSubstanceEnabled
      ? `Explore ${hub.title.toLowerCase()} types along Scenic 30A, then open a category hub for the full town grid.`
      : `Local ${hub.title.toLowerCase()} along Scenic 30A in South Walton, Florida`,
    numberOfItems: listingPool.length,
  };

  const metaParts: string[] = [
    `${hub.businesses.length} ${hub.businesses.length === 1 ? "listing" : "listings"}`,
  ];
  if (townCount > 0) {
    metaParts.push(`${townCount} ${townCount === 1 ? "town" : "towns"}`);
  }
  if (seoSubstanceEnabled && leafLinks.length > 0) {
    metaParts.push(`${leafLinks.length} types`);
  } else {
    const regionalFull = partitionCategoryBusinessesByTown(hub.businesses).regional;
    if (!seoSubstanceEnabled && regionalFull.length > 0) {
      metaParts.push(`${regionalFull.length} regional`);
    }
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
            seoSubstanceEnabled
              ? townCount > 0
                ? `${hub.title} across Scenic Highway 30A — start with a type hub for the full by-town list, or sample featured listings below.`
                : `${hub.title} serving Scenic Highway 30A and South Walton — open a type hub for the full listing grid.`
              : townCount > 0
                ? `Local ${hub.title.toLowerCase()} along Scenic Highway 30A — by town and regional providers.`
                : `Local ${hub.title.toLowerCase()} serving Scenic Highway 30A and South Walton.`
          }
          collapsibleDescription={
            seoSubstanceEnabled
              ? `This rollup groups related ${hub.title.toLowerCase()} so you can jump into a specific category. Full town-by-town browsing lives on those leaf hubs; the sample below is a quick orientation.`
              : `Explore ${hub.title.toLowerCase()} by town when there is a storefront, or under Regional for mobile and appointment-based providers. Confirm hours and availability with each business.`
          }
          meta={<>{metaParts.join(" · ")}</>}
          breadcrumbs={
            <HubBreadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Businesses", href: businessesHref },
                { name: hub.title, href: hubPath, current: true },
              ]}
              analyticsCategory="browse_group_hub_breadcrumb"
            />
          }
        />

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:px-10">
          {seoSubstanceEnabled ? <BrowseGroupLeafLinks leaves={leafLinks} /> : null}

          {mapMarkers.length > 0 ? (
            <BusinessMapSection
              markers={mapMarkers}
              title={seoSubstanceEnabled ? `Map sample: ${hub.title}` : `Map of ${hub.title}`}
              description={
                seoSubstanceEnabled
                  ? "A sample of storefronts with a mapped location."
                  : "Storefronts with a mapped location."
              }
            />
          ) : null}

          {seoSubstanceEnabled ? (
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
          ) : (
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
          )}
        </div>

        <ListBusinessHomeCta />
      </main>
    </div>
  );
}
