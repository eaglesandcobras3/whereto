import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubTownSections } from "@/components/browse/CategoryHubTownSections";
import { CategoryHubEditorial } from "@/components/browse/CategoryHubEditorial";
import { ListBusinessHomeCta } from "@/components/home/ListBusinessHomeCta";
import { IrseAdminBadge } from "@/components/irse/IrseAdminBadge";
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
import { partitionCategoryBusinessesByTown } from "@/lib/data/category-hub";
import { categoryHubIntro } from "@/lib/seo/page-intro-copy";
import { SeoImprovementsGate } from "@/components/feature-flags/SeoImprovementsGate";

type Props = {
  cat: CategoryRow;
  townGroups: CategoryTownGroup[];
  businesses: CategoryBusinessRow[];
};

export function CategoryHubView({ cat, townGroups: _townGroups, businesses }: Props) {
  const hubPath = categoryHubPath(cat.slug);
  const { townGroups, regional } = partitionCategoryBusinessesByTown(businesses);
  const townCount = townGroups.length;
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
    { name: "Businesses", url: "/businesses" },
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

  const metaParts: string[] = [
    `${businesses.length} ${businesses.length === 1 ? "listing" : "listings"}`,
  ];
  if (townCount > 0) {
    metaParts.push(
      `${townCount} ${townCount === 1 ? "town" : "towns"}`,
    );
  }
  if (regional.length > 0) {
    metaParts.push(
      `${regional.length} regional`,
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <IrseAdminBadge kind="category" slug={cat.slug} />
      <SeoImprovementsGate>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      </SeoImprovementsGate>
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
          description={
            townCount > 0
              ? `Local ${cat.title.toLowerCase()} along Scenic Highway 30A in South Walton, Florida — by town and regional providers.`
              : `Local ${cat.title.toLowerCase()} serving Scenic Highway 30A and South Walton, Florida.`
          }
          collapsibleDescription={intro}
          meta={<>{metaParts.join(" · ")}</>}
        />

        <div className="mx-auto max-w-6xl px-4 py-12 md:px-10">
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
            />
          </div>
        </div>

        <ListBusinessHomeCta />

        <SeoImprovementsGate>
          <CategoryHubEditorial categorySlug={cat.slug} />
        </SeoImprovementsGate>
      </main>
    </div>
  );
}
