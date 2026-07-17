import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubTownSections } from "@/components/browse/CategoryHubTownSections";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";
import {
  isUnifiedRollupSlug,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import type { BrowseGroupHubPage } from "@/lib/data/browse-group-hub";
import { partitionCategoryBusinessesByTown } from "@/lib/data/category-hub";
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
  const { townGroups, regional } = partitionCategoryBusinessesByTown(hub.businesses);
  const townCount = townGroups.length;

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

  const metaParts: string[] = [
    `${hub.businesses.length} ${hub.businesses.length === 1 ? "listing" : "listings"}`,
  ];
  if (townCount > 0) {
    metaParts.push(`${townCount} ${townCount === 1 ? "town" : "towns"}`);
  }
  if (regional.length > 0) {
    metaParts.push(`${regional.length} regional`);
  }

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
          description={
            townCount > 0
              ? `Local ${hub.title.toLowerCase()} along Scenic Highway 30A — by town and regional providers.`
              : `Local ${hub.title.toLowerCase()} serving Scenic Highway 30A and South Walton.`
          }
          collapsibleDescription={`Browse ${hub.title.toLowerCase()} by town when there is a storefront, or under Regional for mobile and appointment-based providers. Confirm hours and availability with each business.`}
          meta={<>{metaParts.join(" · ")}</>}
        />

        <div className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <CategoryHubTownSections
            townGroups={townGroups}
            regional={regional}
            categorySlug={hub.slug}
            emptyMessage={
              <p className="text-[var(--color-text-secondary)]">
                No listings found for this category yet.
              </p>
            }
          />
        </div>
      </main>
    </div>
  );
}
