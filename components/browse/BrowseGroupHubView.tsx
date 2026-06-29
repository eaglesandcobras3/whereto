import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubTownSections } from "@/components/browse/CategoryHubTownSections";
import { generateBreadcrumbSchema, generateItemListSchema } from "@/lib/seo/breadcrumb-schema";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";
import type { BrowseGroupHubPage } from "@/lib/data/browse-group-hub";

type Props = {
  hub: BrowseGroupHubPage;
};

export function BrowseGroupHubView({ hub }: Props) {
  const hubPath = businessBrowseGroupHubPath(hub.slug);
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
          collapsibleDescription={`Browse storefront listings in ${hub.title.toLowerCase()} by town. Confirm hours and availability with each business before you visit.`}
          meta={
            <>
              {hub.businesses.length}{" "}
              {hub.businesses.length === 1 ? "listing" : "listings"} across {townCount}{" "}
              {townCount === 1 ? "town" : "towns"}
            </>
          }
        />

        <div className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <CategoryHubTownSections
            townGroups={hub.townGroups}
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
