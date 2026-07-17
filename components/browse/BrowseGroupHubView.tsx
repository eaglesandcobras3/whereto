import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubTownSections } from "@/components/browse/CategoryHubTownSections";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";
import {
  isUnifiedRollupSlug,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import type { BrowseGroupHubPage } from "@/lib/data/browse-group-hub";
import { groupCategoryBusinessesByTown } from "@/lib/data/category-hub";
import type { BusinessCategoryGroupSlug } from "@/lib/business-categories/groups";

type Props = {
  hub: BrowseGroupHubPage;
};

function hubPathFor(slug: string): string {
  if (isUnifiedRollupSlug(slug)) return unifiedRollupHubPath(slug);
  return businessBrowseGroupHubPath(slug as BusinessCategoryGroupSlug);
}

export function BrowseGroupHubView({ hub }: Props) {
  const hubPath = hubPathFor(hub.slug);
  const places = hub.businesses.filter((b) => b.is_storefront);
  const services = hub.businesses.filter((b) => b.is_service_business && !b.is_storefront);
  const splitSections = places.length > 0 && services.length > 0;
  const townCount = hub.townGroups.filter((g) => g.slug).length;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/categories" },
    { name: hub.title, url: hubPath },
  ]);

  const itemListSchema = {
    ...generateItemListSchema(
      hub.businesses.slice(0, 50).map((b) => ({
        name: b.name,
        url: `/business/${b.slug}`,
      })),
    ),
    name: `${hub.title} on 30A, Florida`,
    description: `Local ${hub.title.toLowerCase()} along Scenic 30A in South Walton, Florida`,
    numberOfItems: hub.businesses.length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main className="flex-1">
        <BrowseHubHero
          title={`${hub.title} on 30A`}
          description={`Local ${hub.title.toLowerCase()} across ${townCount} ${townCount === 1 ? "town" : "towns"} along Scenic Highway 30A in South Walton, Florida.`}
          collapsibleDescription={`Browse listings in ${hub.title.toLowerCase()} by town — places you can visit and service providers together. Confirm hours and availability with each business.`}
          meta={
            <>
              {hub.businesses.length}{" "}
              {hub.businesses.length === 1 ? "listing" : "listings"} across {townCount}{" "}
              {townCount === 1 ? "town" : "towns"}
            </>
          }
        />

        <div className="mx-auto max-w-6xl px-4 py-12 md:px-10 space-y-10">
          {splitSections ? (
            <>
              <div className="space-y-4">
                <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
                  Places
                </h2>
                <CategoryHubTownSections
                  townGroups={groupCategoryBusinessesByTown(places)}
                  categorySlug={hub.slug}
                />
              </div>
              <div className="space-y-4">
                <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
                  Services
                </h2>
                <CategoryHubTownSections
                  townGroups={groupCategoryBusinessesByTown(services)}
                  categorySlug={hub.slug}
                />
              </div>
            </>
          ) : (
            <CategoryHubTownSections
              townGroups={hub.townGroups}
              categorySlug={hub.slug}
              emptyMessage={
                <p className="text-[var(--color-text-secondary)]">
                  No listings found for this category yet.
                </p>
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
