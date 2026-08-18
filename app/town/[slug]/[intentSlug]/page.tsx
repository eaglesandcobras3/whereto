import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { PlaceGuidesSection } from "@/components/place/PlaceGuidesSection";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import {
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/seo/breadcrumb-schema";
import { getTownBySlug, getGuidesForTown } from "@/lib/data/town-hub";
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";
import {
  fetchEligibleTownIntentRows,
  fetchTownIntentPayload,
  getTownIntentTemplate,
  listEligibleTownIntentTemplates,
} from "@/lib/seo/town-intent-pages";
import { getServiceSupabase, getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { townPagePath } from "@/lib/routes/town-page-path";
import { townIntentPath } from "@/lib/routes/town-intent-path";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";

export const revalidate = 21600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; intentSlug: string }> };

type PageData = Awaited<ReturnType<typeof loadTownIntentPageData>>;

async function loadTownIntentPageData(townSlug: string, intentSlug: string) {
  const normalizedTownSlug = normalizeUrlSegment(townSlug);
  const normalizedIntentSlug = normalizeUrlSegment(intentSlug);
  if (!normalizedTownSlug || !normalizedIntentSlug) return null;

  const template = getTownIntentTemplate(normalizedIntentSlug);
  if (!template) return null;

  const town = await getTownBySlug(normalizedTownSlug);
  if (!town) return null;

  const supabase = getServiceSupabase();
  const [payload, relatedTemplates, guides] = await Promise.all([
    fetchTownIntentPayload(supabase, String(town.id), template.seoSlug),
    listEligibleTownIntentTemplates(supabase, String(town.id)),
    getGuidesForTown(String(town.id)),
  ]);

  if (!payload) return null;

  const recommendations = payload.recommendations.filter((rec) => Boolean(rec.business?.slug));
  if (!recommendations.length) return null;

  return {
    town,
    template,
    payload: { ...payload, recommendations },
    relatedTemplates: relatedTemplates.filter((row) => row.seoSlug !== template.seoSlug).slice(0, 6),
    guides: guides.slice(0, 6),
  };
}

export async function generateStaticParams(): Promise<Array<{ slug: string; intentSlug: string }>> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  const rows = await fetchEligibleTownIntentRows(supabase);
  return rows.map((row) => ({ slug: row.townSlug, intentSlug: row.seoSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, intentSlug } = await params;
  const page = await loadTownIntentPageData(slug, intentSlug);
  if (!page) return { title: metadataTitleSiteOnly };

  const title = `${page.template.seoTitle(page.town.name)} | WhereTo30A`;
  const description =
    page.payload.summary?.trim() ||
    `Local picks for ${page.template.seoTitle(page.town.name).toLowerCase()} on Scenic Highway 30A.`;

  return {
    title,
    description,
    alternates: { canonical: townIntentPath(page.town.slug, page.template.seoSlug) },
    openGraph: {
      title,
      description,
      url: townIntentPath(page.town.slug, page.template.seoSlug),
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

function metaLine(page: NonNullable<PageData>): string {
  const count = page.payload.recommendations.length;
  return `${count} ${count === 1 ? "pick" : "picks"} in ${page.town.name}`;
}

export default async function TownIntentPage({ params }: Props) {
  const { slug, intentSlug } = await params;
  const page = await loadTownIntentPageData(slug, intentSlug);
  if (!page) notFound();

  const pagePath = townIntentPath(page.town.slug, page.template.seoSlug);
  const townPath = townPagePath(page.town.slug);

  const itemListSchema = {
    ...generateItemListSchema(
      page.payload.recommendations.map((rec) => ({
        name: rec.business.name,
        url: `/business/${rec.business.slug}`,
      })),
    ),
    name: page.template.seoTitle(page.town.name),
    description: page.payload.summary,
    numberOfItems: page.payload.recommendations.length,
  };

  const collectionSchema = generateCollectionPageSchema({
    name: page.template.seoTitle(page.town.name),
    path: pagePath,
    description: page.payload.summary,
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
                name: page.template.seoTitle(page.town.name),
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
              {page.template.seoTitle(page.town.name)}
            </h1>
            <p className="text-sm text-[var(--color-text-tertiary)]">{metaLine(page)}</p>
            <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
              {page.payload.summary}
            </p>
          </header>

          <section className="mt-8 space-y-4 sm:mt-10">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {page.payload.recommendations.map((rec) => (
                <BusinessPreviewCard
                  key={rec.business_id}
                  name={rec.business.name}
                  slug={rec.business.slug!}
                  excerpt={rec.explanation || rec.business.ai_summary || undefined}
                  heroImageUrl={rec.business.image_url ?? null}
                  meta={rec.business.address || rec.business.category_name || null}
                  analyticsCategory="town_intent_results"
                  analyticsLabel={`${page.town.slug}:${page.template.seoSlug}:${rec.business.slug}`}
                  ctaLabel="Open listing"
                />
              ))}
            </div>
          </section>

          {page.relatedTemplates.length > 0 ? (
            <div className="mt-10">
              <PlaceRelatedSection
                title={`More ways to plan ${page.town.name}`}
                description={`Keep browsing ${page.town.name} by the kind of stop or outing you have in mind.`}
              >
                {page.relatedTemplates.map((template) => {
                  const href = townIntentPath(page.town.slug, template.seoSlug);
                  return (
                    <Link
                      key={template.seoSlug}
                      href={href}
                      className="editorial-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/40 hover:shadow-md"
                    >
                      <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
                        {template.seoTitle(page.town.name)}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        See local picks curated for this exact plan.
                      </p>
                    </Link>
                  );
                })}
              </PlaceRelatedSection>
            </div>
          ) : null}

          <div className="mt-10">
            <PlaceGuidesSection
              title={`Guides for ${page.town.name}`}
              description={`Broader planning guides to pair with ${page.template.seoTitle(page.town.name).toLowerCase()}.`}
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
