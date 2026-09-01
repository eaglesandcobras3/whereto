import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { PlaceGuidesSection } from "@/components/place/PlaceGuidesSection";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { getTownBySlug, getGuidesForTown } from "@/lib/data/town-hub";
import { getTownIntentSectionsForTown } from "@/lib/data/town-category-sections";
import {
  normalizeIntentSlug,
  resolveTownIntentSection,
  type BrowseGroupSection,
} from "@/lib/business-categories/group-browse-sections";
import { browseSectionBySlug } from "@/lib/categories/unified-browse";
import {
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/seo/breadcrumb-schema";
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { townPagePath } from "@/lib/routes/town-page-path";
import { townIntentPath } from "@/lib/routes/town-intent-path";
import { fetchSitemapTownIntentRows } from "@/lib/seo/fetch-sitemap-town-intents";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { BusinessMapSection } from "@/components/maps/BusinessMapSection";
import { listIntentSectionMapMarkers } from "@/lib/data/intent-section-map";
import { getAllFeatureFlags, isFeedbackFeatureEnabled } from "@/lib/feature-flags";
import { PlaceIntentNavSection } from "@/components/place/PlaceIntentNavSection";
import { buildPopulatedPlaceIntentNavOptions } from "@/lib/nav/build-place-intent-nav-options";
import { resolvePlaceIntentNavFromIntentSlug } from "@/lib/nav/place-intent-nav";
import { listTownsForTownsHub } from "@/lib/data/towns-hub-list";

export const revalidate = 21600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; intentSlug: string }> };

function relatedIntentSections(
  active: BrowseGroupSection,
  rollupSections: BrowseGroupSection[],
  leafSections: BrowseGroupSection[],
): BrowseGroupSection[] {
  const isRollup = Boolean(browseSectionBySlug(active.slug));
  const pool = isRollup ? rollupSections : leafSections;
  return pool.filter(
    (section) => section.slug !== active.slug && section.businesses.length > 0,
  );
}

async function loadTownIntentPageData(townSlug: string, intentSlug: string) {
  const normalizedTownSlug = normalizeUrlSegment(townSlug);
  const normalizedIntentSlug = normalizeIntentSlug(normalizeUrlSegment(intentSlug));
  if (!normalizedTownSlug || !normalizedIntentSlug) return null;

  const town = await getTownBySlug(normalizedTownSlug);
  if (!town) return null;

  const [{ rollupSections, leafSections }, guides, flags, hubTowns] = await Promise.all([
    getTownIntentSectionsForTown(String(town.id)),
    getGuidesForTown(String(town.id)),
    getAllFeatureFlags(),
    listTownsForTownsHub(),
  ]);
  const activeSection = resolveTownIntentSection(
    rollupSections,
    leafSections,
    normalizedIntentSlug,
  );
  if (!activeSection) return null;

  const mapMarkers = await listIntentSectionMapMarkers(
    activeSection.businesses,
    activeSection.slug,
  );

  return {
    town,
    activeSection,
    relatedSections: relatedIntentSections(
      activeSection,
      rollupSections,
      leafSections,
    ),
    guides: guides.slice(0, 6),
    mapMarkers,
    feedbackEnabled: isFeedbackFeatureEnabled(flags),
    isRollupIntent: Boolean(browseSectionBySlug(activeSection.slug)),
    navPlaces: hubTowns.map((row) => ({ slug: row.slug, label: row.name })),
    navOptions: buildPopulatedPlaceIntentNavOptions(rollupSections, leafSections),
    navSelection: resolvePlaceIntentNavFromIntentSlug(normalizedIntentSlug),
  };
}

export async function generateStaticParams(): Promise<Array<{ slug: string; intentSlug: string }>> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  const rows = await fetchSitemapTownIntentRows(supabase);
  return rows
    .map((row) => ({
      slug: String(row.town_slug ?? "").trim(),
      intentSlug: String(row.seo_slug ?? "").trim(),
    }))
    .filter((row) => row.slug && row.intentSlug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, intentSlug } = await params;
  const page = await loadTownIntentPageData(slug, intentSlug);
  if (!page) return { title: metadataTitleSiteOnly };

  const title = `${page.activeSection.title} in ${page.town.name} | WhereTo30A`;
  const description = `Browse ${page.activeSection.title.toLowerCase()} in ${page.town.name} with local business picks from WhereTo30A.`;

  return {
    title,
    description,
    alternates: { canonical: townIntentPath(page.town.slug, page.activeSection.slug) },
    openGraph: {
      title,
      description,
      url: townIntentPath(page.town.slug, page.activeSection.slug),
      type: "website",
      images: page.town.hero_image_thumb_url ? [page.town.hero_image_thumb_url] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: page.town.hero_image_thumb_url ? [page.town.hero_image_thumb_url] : undefined,
    },
  };
}

export default async function TownIntentPage({ params }: Props) {
  const { slug, intentSlug } = await params;
  const page = await loadTownIntentPageData(slug, intentSlug);
  if (!page) notFound();

  const pagePath = townIntentPath(page.town.slug, page.activeSection.slug);
  const townPath = townPagePath(page.town.slug);
  const listingCount = page.activeSection.businesses.length;
  const heroDescription = `Local ${page.activeSection.title.toLowerCase()} in ${page.town.name} along Scenic Highway 30A.`;
  const placeNav = (
    <PlaceIntentNavSection
      mode="town"
      places={page.navPlaces}
      categories={page.navOptions.categories}
      subcategories={page.navOptions.subcategories}
      currentPlaceSlug={page.town.slug}
      currentCategorySlug={page.navSelection.categorySlug}
      currentSubcategorySlug={page.navSelection.subcategorySlug}
      overlay={page.mapMarkers.length > 0}
    />
  );

  const itemListSchema = {
    ...generateItemListSchema(
      page.activeSection.businesses.map((business) => ({
        name: business.name,
        url: `/business/${business.slug}`,
      })),
    ),
    name: `${page.activeSection.title} in ${page.town.name}`,
    description: heroDescription,
    numberOfItems: listingCount,
  };

  const collectionSchema = generateCollectionPageSchema({
    name: `${page.activeSection.title} in ${page.town.name}`,
    path: pagePath,
    description: heroDescription,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
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
          title={`${page.activeSection.title} in ${page.town.name}`}
          description={heroDescription}
          eyebrow={`${page.town.name} · 30A`}
          meta={
            <>
              {listingCount} {listingCount === 1 ? "listing" : "listings"}
            </>
          }
          breadcrumbs={
            <HubBreadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Towns", href: "/towns" },
                { name: page.town.name, href: townPath },
                {
                  name: page.activeSection.title,
                  href: pagePath,
                  current: true,
                },
              ]}
              analyticsCategory="town_intent_breadcrumb"
            />
          }
        />

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:px-10">
          {page.mapMarkers.length === 0 ? placeNav : null}

          {page.mapMarkers.length > 0 ? (
            <BusinessMapSection
              markers={page.mapMarkers}
              title={`Map of ${page.activeSection.title} in ${page.town.name}`}
              description="Storefront businesses with a mapped location."
              fieldFlagEntityId={page.feedbackEnabled ? page.town.id : null}
              fieldFlagEntity="town"
            >
              {placeNav}
            </BusinessMapSection>
          ) : null}

          <section className="space-y-4" aria-labelledby="town-intent-listings-heading">
            <div>
              <h2
                id="town-intent-listings-heading"
                className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl"
              >
                {page.activeSection.title} in {page.town.name}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
                Browse listings in this town section.
              </p>
            </div>
            {listingCount > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {page.activeSection.businesses.map((business) => (
                  <li key={business.id} className="h-full">
                    <BusinessPreviewCard
                      name={business.name}
                      slug={business.slug}
                      excerpt={business.ai_summary || business.ai_one_liner || undefined}
                      heroImageUrl={business.hero_image_url}
                      meta={page.town.name}
                      analyticsCategory="town_intent_results"
                      analyticsLabel={`${page.town.slug}:${page.activeSection.slug}:${business.slug}`}
                      ctaLabel="Open listing"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
                No {page.activeSection.title.toLowerCase()} listings in {page.town.name} yet.
              </p>
            )}
          </section>

          {page.relatedSections.length > 0 ? (
            <PlaceRelatedSection
              title={`More categories in ${page.town.name}`}
              description={
                page.isRollupIntent
                  ? "Open the other rollup-category pages connected to this town."
                  : "Open other category pages connected to this town."
              }
            >
              {page.relatedSections.map((section) => (
                <Link
                  key={section.slug}
                  href={townIntentPath(page.town.slug, section.slug)}
                  className="editorial-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/40 hover:shadow-md"
                >
                  <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    See the dedicated page for this town section.
                  </p>
                </Link>
              ))}
            </PlaceRelatedSection>
          ) : null}

          <PlaceGuidesSection
            title={`Guides for ${page.town.name}`}
            description={`Planning guides related to ${page.town.name}.`}
            guides={page.guides}
            analyticsCategory="town_intent_guides"
            flagEntity="town"
            flagEntityId={page.town.id}
            placeName={page.town.name}
            placeSlug={page.town.slug}
          />
        </div>
      </main>
    </div>
  );
}
