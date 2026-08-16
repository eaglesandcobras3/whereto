import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubTownSections } from "@/components/browse/CategoryHubTownSections";
import { ListBusinessHomeCta } from "@/components/home/ListBusinessHomeCta";
import { IrseAdminBadge } from "@/components/irse/IrseAdminBadge";
import { BusinessMapSection } from "@/components/maps/BusinessMapSection";
import { PlaceGuidesSection } from "@/components/place/PlaceGuidesSection";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import {
  generateItemListSchema,
  generateCollectionPageSchema,
} from "@/lib/seo/breadcrumb-schema";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import type {
  CategoryBusinessRow,
  CategoryRow,
  CategoryTownGroup,
} from "@/lib/data/category-hub";
import {
  categoryHubInventoryFromPage,
  partitionCategoryBusinessesByTown,
} from "@/lib/data/category-hub";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import type { TownGuideCard } from "@/lib/data/town-hub";
import {
  buildCategoryHubEditorialBody,
  buildCategoryHubHeroDescription,
  buildCategoryHubSupportingIntro,
} from "@/lib/seo/category-hub-substance";
import { categoryHubIntro } from "@/lib/seo/page-intro-copy";

type Props = {
  cat: CategoryRow;
  townGroups: CategoryTownGroup[];
  businesses: CategoryBusinessRow[];
  mapMarkers?: BusinessMapMarker[];
  guides?: TownGuideCard[];
  /** PostHog `category_hub_seo` — inventory editorial + guides. */
  seoSubstanceEnabled?: boolean;
};

export function CategoryHubView({
  cat,
  townGroups: _townGroups,
  businesses,
  mapMarkers = [],
  guides = [],
  seoSubstanceEnabled = false,
}: Props) {
  const hubPath = categoryHubPath(cat.slug);
  const { townGroups, regional } = partitionCategoryBusinessesByTown(businesses);
  const inventory = categoryHubInventoryFromPage({ cat, businesses });

  const heroDescription = seoSubstanceEnabled
    ? buildCategoryHubHeroDescription(inventory)
    : townGroups.length > 0
      ? `Local ${cat.title.toLowerCase()} along Scenic Highway 30A in South Walton, Florida — by town and regional providers.`
      : `Local ${cat.title.toLowerCase()} serving Scenic Highway 30A and South Walton, Florida.`;

  const collapsibleDescription = seoSubstanceEnabled
    ? buildCategoryHubSupportingIntro(inventory)
    : cat.excerpt?.trim() ||
      categoryHubIntro(cat.title, businesses.length, townGroups.length);

  const editorialBody = seoSubstanceEnabled
    ? buildCategoryHubEditorialBody(inventory)
    : null;

  const itemListSchema = {
    ...generateItemListSchema(
      businesses.slice(0, 50).map((b) => ({
        name: b.name,
        url: `/business/${b.slug}`,
      })),
    ),
    name: `${cat.title} on 30A, Florida`,
    description: heroDescription,
    numberOfItems: businesses.length,
  };

  const collectionSchema = generateCollectionPageSchema({
    name: `${cat.title} on 30A`,
    path: hubPath,
    description: heroDescription,
  });

  const metaParts: string[] = [
    `${businesses.length} ${businesses.length === 1 ? "listing" : "listings"}`,
  ];
  if (townGroups.length > 0) {
    metaParts.push(
      `${townGroups.length} ${townGroups.length === 1 ? "town" : "towns"}`,
    );
  }
  if (regional.length > 0) {
    metaParts.push(`${regional.length} regional`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <IrseAdminBadge kind="category" slug={cat.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main className="flex-1">
        <BrowseHubHero
          title={`${cat.title} on 30A`}
          description={heroDescription}
          collapsibleDescription={collapsibleDescription}
          meta={<>{metaParts.join(" · ")}</>}
          breadcrumbs={
            <HubBreadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Businesses", href: "/businesses" },
                { name: cat.title, href: hubPath, current: true },
              ]}
              analyticsCategory="category_hub_breadcrumb"
            />
          }
        />

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:px-10">
          {editorialBody ? (
            <section
              className="max-w-3xl space-y-3"
              aria-labelledby="category-hub-editorial-heading"
            >
              <h2
                id="category-hub-editorial-heading"
                className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl"
              >
                How we use this hub
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
                {editorialBody}
              </p>
            </section>
          ) : null}

          {mapMarkers.length > 0 ? (
            <BusinessMapSection
              markers={mapMarkers}
              title={`Map of ${cat.title}`}
              description="Storefronts with a mapped location."
            />
          ) : null}

          <div className="min-w-0 space-y-8 sm:space-y-10">
            <CategoryHubTownSections
              townGroups={townGroups}
              regional={regional}
              categorySlug={cat.slug}
              emptyMessage={
                <p className="text-[var(--color-text-secondary)]">
                  No listings found for this category yet.
                </p>
              }
              flagEntity="category"
              flagEntityId={cat.id}
              pageTitle={cat.title}
            />
          </div>

          {seoSubstanceEnabled && guides.length > 0 ? (
            <PlaceGuidesSection
              title="Guides that help with this stop"
              description={`Planning context for ${cat.title.toLowerCase()} days along 30A.`}
              guides={guides}
              analyticsCategory="category_hub_guides"
            />
          ) : null}
        </div>

        <ListBusinessHomeCta />
      </main>
    </div>
  );
}
