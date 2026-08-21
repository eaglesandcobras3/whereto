import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { PlaceGuidesSection } from "@/components/place/PlaceGuidesSection";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
import { getCategorySectionsForPublicPlace } from "@/lib/data/place-category-sections";
import { resolveIntentBrowseSection } from "@/lib/business-categories/group-browse-sections";
import { getGuidesForArea } from "@/lib/data/town-hub";
import {
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/seo/breadcrumb-schema";
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { areaIntentPath } from "@/lib/routes/area-intent-path";
import { fetchSitemapAreaIntentRows } from "@/lib/seo/fetch-sitemap-area-intents";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { BusinessMapSection } from "@/components/maps/BusinessMapSection";
import { listIntentSectionMapMarkers } from "@/lib/data/intent-section-map";
import { getAllFeatureFlags, isFeedbackFeatureEnabled } from "@/lib/feature-flags";

export const revalidate = 21600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; intentSlug: string }> };

async function loadAreaIntentPageData(areaSlug: string, intentSlug: string) {
  const normalizedAreaSlug = normalizeUrlSegment(areaSlug);
  const normalizedIntentSlug = normalizeUrlSegment(intentSlug);
  if (!normalizedAreaSlug || !normalizedIntentSlug) return null;

  const area = await getPublicPlaceBySlug(normalizedAreaSlug);
  if (!area) return null;

  const [sections, guides, flags] = await Promise.all([
    getCategorySectionsForPublicPlace(area),
    getGuidesForArea(area.id, area.town_id),
    getAllFeatureFlags(),
  ]);
  const activeSection = resolveIntentBrowseSection(sections, normalizedIntentSlug);
  if (!activeSection) return null;

  const mapMarkers = await listIntentSectionMapMarkers(
    activeSection.businesses,
    activeSection.slug,
  );

  return {
    area,
    activeSection,
    relatedSections: sections.filter(
      (section) => section.slug !== normalizedIntentSlug && section.businesses.length > 0,
    ),
    guides: guides.slice(0, 6),
    mapMarkers,
    feedbackEnabled: isFeedbackFeatureEnabled(flags),
  };
}

export async function generateStaticParams(): Promise<Array<{ slug: string; intentSlug: string }>> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  const rows = await fetchSitemapAreaIntentRows(supabase);
  return rows
    .map((row) => ({
      slug: String(row.area_slug ?? "").trim(),
      intentSlug: String(row.seo_slug ?? "").trim(),
    }))
    .filter((row) => row.slug && row.intentSlug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, intentSlug } = await params;
  const page = await loadAreaIntentPageData(slug, intentSlug);
  if (!page) return { title: metadataTitleSiteOnly };

  const title = `${page.activeSection.title} in ${page.area.title} | WhereTo30A`;
  const description = `Browse ${page.activeSection.title.toLowerCase()} in ${page.area.title} with local business picks from WhereTo30A.`;

  return {
    title,
    description,
    alternates: { canonical: areaIntentPath(page.area.slug, page.activeSection.slug) },
    openGraph: {
      title,
      description,
      url: areaIntentPath(page.area.slug, page.activeSection.slug),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AreaIntentPage({ params }: Props) {
  const { slug, intentSlug } = await params;
  const page = await loadAreaIntentPageData(slug, intentSlug);
  if (!page) notFound();

  const pagePath = areaIntentPath(page.area.slug, page.activeSection.slug);
  const areaPath = `/area/${page.area.slug}`;
  const listingCount = page.activeSection.businesses.length;
  const heroDescription = `Local ${page.activeSection.title.toLowerCase()} in ${page.area.title} along Scenic Highway 30A.`;

  const itemListSchema = {
    ...generateItemListSchema(
      page.activeSection.businesses.map((business) => ({
        name: business.name,
        url: `/business/${business.slug}`,
      })),
    ),
    name: `${page.activeSection.title} in ${page.area.title}`,
    description: heroDescription,
    numberOfItems: listingCount,
  };

  const collectionSchema = generateCollectionPageSchema({
    name: `${page.activeSection.title} in ${page.area.title}`,
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
          title={`${page.activeSection.title} in ${page.area.title}`}
          description={heroDescription}
          eyebrow={`${page.area.title} · 30A`}
          meta={
            <>
              {listingCount} {listingCount === 1 ? "listing" : "listings"}
            </>
          }
          breadcrumbs={
            <HubBreadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Areas", href: "/areas" },
                { name: page.area.title, href: areaPath },
                {
                  name: page.activeSection.title,
                  href: pagePath,
                  current: true,
                },
              ]}
              analyticsCategory="area_intent_breadcrumb"
            />
          }
        />

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 md:px-10">
          {page.mapMarkers.length > 0 ? (
            <BusinessMapSection
              markers={page.mapMarkers}
              title={`Map of ${page.activeSection.title} in ${page.area.title}`}
              description="Storefront businesses with a mapped location."
              fieldFlagEntityId={page.feedbackEnabled ? page.area.id : null}
              fieldFlagEntity="area"
            />
          ) : null}

          <section className="space-y-4" aria-labelledby="area-intent-listings-heading">
            <div>
              <h2
                id="area-intent-listings-heading"
                className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl"
              >
                {page.activeSection.title} in {page.area.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
                Browse listings in this area section.
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
                      meta={page.area.title}
                      analyticsCategory="area_intent_results"
                      analyticsLabel={`${page.area.slug}:${page.activeSection.slug}:${business.slug}`}
                      ctaLabel="Open listing"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
                No {page.activeSection.title.toLowerCase()} listings in {page.area.title} yet.
              </p>
            )}
          </section>

          {page.relatedSections.length > 0 ? (
            <PlaceRelatedSection
              title={`More categories in ${page.area.title}`}
              description="Open the other rollup-category pages connected to this area."
            >
              {page.relatedSections.map((section) => (
                <Link
                  key={section.slug}
                  href={areaIntentPath(page.area.slug, section.slug)}
                  className="editorial-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/40 hover:shadow-md"
                >
                  <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    See the dedicated page for this area section.
                  </p>
                </Link>
              ))}
            </PlaceRelatedSection>
          ) : null}

          <PlaceGuidesSection
            title={`Guides for ${page.area.title}`}
            description={`Planning guides related to ${page.area.title}.`}
            guides={page.guides}
            analyticsCategory="area_intent_guides"
            flagEntity="area"
            flagEntityId={page.area.id}
            placeName={page.area.title}
            placeSlug={page.area.slug}
          />
        </div>
      </main>
    </div>
  );
}
