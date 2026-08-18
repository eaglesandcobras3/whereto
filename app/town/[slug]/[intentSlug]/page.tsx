import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { PlaceGuidesSection } from "@/components/place/PlaceGuidesSection";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { getTownBySlug, getGuidesForTown } from "@/lib/data/town-hub";
import { getCategorySectionsForTown } from "@/lib/data/town-category-sections";
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

export const revalidate = 21600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; intentSlug: string }> };

async function loadTownIntentPageData(townSlug: string, intentSlug: string) {
  const normalizedTownSlug = normalizeUrlSegment(townSlug);
  const normalizedIntentSlug = normalizeUrlSegment(intentSlug);
  if (!normalizedTownSlug || !normalizedIntentSlug) return null;

  const town = await getTownBySlug(normalizedTownSlug);
  if (!town) return null;

  const [sections, guides] = await Promise.all([
    getCategorySectionsForTown(String(town.id)),
    getGuidesForTown(String(town.id)),
  ]);
  const activeSection = sections.find((section) => section.slug === normalizedIntentSlug);
  if (!activeSection || activeSection.businesses.length === 0) return null;

  return {
    town,
    activeSection,
    relatedSections: sections.filter(
      (section) => section.slug !== normalizedIntentSlug && section.businesses.length > 0,
    ),
    guides: guides.slice(0, 6),
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

  const itemListSchema = {
    ...generateItemListSchema(
      page.activeSection.businesses.map((business) => ({
        name: business.name,
        url: `/business/${business.slug}`,
      })),
    ),
    name: `${page.activeSection.title} in ${page.town.name}`,
    description: `Local picks for ${page.activeSection.title.toLowerCase()} in ${page.town.name}.`,
    numberOfItems: page.activeSection.businesses.length,
  };

  const collectionSchema = generateCollectionPageSchema({
    name: `${page.activeSection.title} in ${page.town.name}`,
    path: pagePath,
    description: `Local picks for ${page.activeSection.title.toLowerCase()} in ${page.town.name}.`,
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
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 md:px-10 md:py-12">
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

          <header className="mt-4 max-w-3xl space-y-4 sm:mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
              Town guide
            </p>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              {page.activeSection.title} in {page.town.name}
            </h1>
            <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
              Browse the {page.activeSection.title.toLowerCase()} section from {page.town.name}
              {"’"}s
              local guide on its own page.
            </p>
          </header>

          <section className="mt-8 space-y-4 sm:mt-10">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {page.activeSection.businesses.map((business) => (
                <BusinessPreviewCard
                  key={business.id}
                  name={business.name}
                  slug={business.slug}
                  excerpt={business.ai_summary || business.ai_one_liner || undefined}
                  heroImageUrl={business.hero_image_url}
                  analyticsCategory="town_intent_results"
                  analyticsLabel={`${page.town.slug}:${page.activeSection.slug}:${business.slug}`}
                  ctaLabel="Open listing"
                />
              ))}
            </div>
          </section>

          {page.relatedSections.length > 0 ? (
            <div className="mt-10">
              <PlaceRelatedSection
                title={`More categories in ${page.town.name}`}
                description="Open the other rollup-category pages connected to this town."
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
            </div>
          ) : null}

          <div className="mt-10">
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
        </div>
      </main>
    </div>
  );
}
