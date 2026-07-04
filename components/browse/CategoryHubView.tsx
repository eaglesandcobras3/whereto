import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubTownSections } from "@/components/browse/CategoryHubTownSections";
import { CategoryHubEditorial } from "@/components/browse/CategoryHubEditorial";
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/seo/breadcrumb-schema";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import type {
  CategoryBusinessRow,
  CategoryRow,
  CategoryTownGroup,
} from "@/lib/data/category-hub";
import { categoryHubIntro } from "@/lib/seo/page-intro-copy";

type Props = {
  cat: CategoryRow;
  townGroups: CategoryTownGroup[];
  businesses: CategoryBusinessRow[];
  seoImprovements?: boolean;
};

export function CategoryHubView({ cat, townGroups, businesses, seoImprovements = false }: Props) {
  const hubPath = categoryHubPath(cat.slug);
  const townCount = townGroups.filter((g) => g.slug).length;
  const intro =
    cat.excerpt?.trim() ||
    categoryHubIntro(cat.title, businesses.length, townCount);

  const collectionSchema = generateCollectionPageSchema({
    name: `${cat.title} on 30A`,
    path: hubPath,
    description: intro,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/categories" },
    { name: cat.title, url: hubPath },
  ]);

  const itemListSchema = {
    ...generateItemListSchema(
      businesses.slice(0, 50).map((b) => ({
        name: b.name,
        url: `/business/${b.slug}`,
      })),
    ),
    name: `${cat.title} on 30A, Florida`,
    description: `Local ${cat.title.toLowerCase()} along Scenic 30A in South Walton, Florida`,
    numberOfItems: businesses.length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      {seoImprovements ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      ) : null}
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
          title={`${cat.title} on 30A`}
          description={`Local ${cat.title.toLowerCase()} across ${townCount} ${townCount === 1 ? "town" : "towns"} along Scenic Highway 30A in South Walton, Florida.`}
          collapsibleDescription={intro}
          meta={
            <>
              {businesses.length} {businesses.length === 1 ? "listing" : "listings"} across{" "}
              {townCount} {townCount === 1 ? "town" : "towns"}
            </>
          }
        />

        {seoImprovements ? <CategoryHubEditorial categorySlug={cat.slug} /> : null}

        <div className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <div className="min-w-0 space-y-8 sm:space-y-10">
            <CategoryHubTownSections
              townGroups={townGroups}
              categorySlug={cat.slug}
              emptyMessage={
                <p className="text-[var(--color-text-secondary)]">
                  No listings found for this category yet.
                </p>
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
