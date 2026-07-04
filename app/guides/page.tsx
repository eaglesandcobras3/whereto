import Link from "next/link";
import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { GuideCard } from "@/components/discovery/GuideCard";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { PRIMARY_EDITORIAL_GUIDE_PATH, PRIMARY_EDITORIAL_GUIDE_SLUG } from "@/lib/seo/sitemap-strategy";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { hubGuidesIntro, hubGuidesClusterIntro } from "@/lib/seo/page-intro-copy";
import { guidesHubMetadata } from "@/lib/seo/hub-metadata";
import {
  GUIDE_INTENT_CLUSTER_LABELS,
  type GuideIntentCluster,
  guideIntentForSlug,
  guidesByCluster,
} from "@/lib/seo/guide-intent-clusters";
import {
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/seo/breadcrumb-schema";

export const revalidate = 3600;

const GUIDE_POOL_LIMIT = 100;

const CLUSTER_ORDER: GuideIntentCluster[] = [
  "first_timer",
  "beach_access",
  "family_travel",
  "girls_trip",
  "town_guide",
  "logistics",
  "editorial",
];

export const metadata: Metadata = guidesHubMetadata();

type GuideRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

function guideSubtitle(
  excerpt: string | null,
  seoDescription: string | null,
  guideType: string | null,
): string | null {
  const text = excerpt?.trim() || seoDescription?.trim();
  if (text) return text;
  if (guideType) return guideType.replace(/_/g, " ");
  return null;
}

async function getGuides(): Promise<GuideRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("guides")
    .select(
      "slug, title, excerpt, seo_description, guide_type, main_image, hero_image, main_image_url, hero_image_url",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(GUIDE_POOL_LIMIT);

  if (error) {
    console.error("guides hub: guides query", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    return {
      slug: String(r.slug),
      title: String((r as { title: string }).title),
      subtitle: guideSubtitle(
        (r.excerpt as string | null) ?? null,
        (r.seo_description as string | null) ?? null,
        (r.guide_type as string | null) ?? null,
      ),
      hero_image_url: heroUrl,
    };
  });
}

export default async function GuidesPage() {
  const allGuides = await getGuides();
  const planningGuide = allGuides.find((g) => g.slug === PRIMARY_EDITORIAL_GUIDE_SLUG);
  const slugList = allGuides.map((g) => g.slug);
  const clustered = guidesByCluster(slugList);
  const mappedSlugs = new Set(
    Object.values(clustered)
      .flat()
      .map((m) => m.slug),
  );
  const unmappedGuides = allGuides.filter((g) => !mappedSlugs.has(g.slug));

  const collectionSchema = generateCollectionPageSchema({
    name: "30A Travel Guides",
    path: "/guides",
    description: hubGuidesIntro(),
  });
  const itemListSchema = generateItemListSchema(
    allGuides.map((g) => ({ name: g.title, url: `/guide/${g.slug}` })),
  );

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <HubBreadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Guides", href: "/guides", current: true },
          ]}
          analyticsCategory="guides_hub_breadcrumb"
        />
      </div>

      <BrowseHubHero
        title="Travel guides"
        description="Editorial guides for planning your trip: town picks, dining, beaches, and local advice written for the Emerald Coast."
        collapsibleDescription={hubGuidesIntro()}
      />

      {planningGuide ? (
        <section className="border-b border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-10">
          <div className="mx-auto max-w-6xl px-4">
            <Link
              href={PRIMARY_EDITORIAL_GUIDE_PATH}
              {...gaClickProps({
                event: "nav_click",
                category: "guides_hub",
                label: "planning_guide",
              })}
              className="group flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md sm:flex-row sm:items-center sm:gap-6"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-3xl">menu_book</span>
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-eyebrow mb-1">Start here</p>
                <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors sm:text-2xl">
                  {planningGuide.title}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {planningGuide.subtitle ||
                    "First-timer planning: towns, beach access, airports, where to eat, and how to pace your week along Scenic 30A."}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                Read the guide
                <span className="material-symbols-outlined !text-base transition-transform group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      {CLUSTER_ORDER.map((cluster) => {
        const mappings = clustered[cluster];
        if (!mappings?.length) return null;
        const guidesInCluster = mappings
          .map((m) => allGuides.find((g) => g.slug === m.slug))
          .filter((g): g is GuideRow => Boolean(g));
        if (guidesInCluster.length === 0) return null;

        return (
          <section key={cluster} className="border-b border-[var(--color-border)] py-14">
            <div className="mx-auto max-w-6xl px-4">
              <header className="mb-8 max-w-3xl space-y-2">
                <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                  {GUIDE_INTENT_CLUSTER_LABELS[cluster]}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
                  {hubGuidesClusterIntro(cluster)}
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {guidesInCluster.map((guide) => {
                  const intent = guideIntentForSlug(guide.slug);
                  return (
                    <GuideCard
                      key={guide.slug}
                      title={guide.title}
                      slug={guide.slug}
                      subtitle={
                        intent?.primaryKeyword
                          ? `${guide.subtitle ?? ""}`.trim() || intent.primaryKeyword
                          : (guide.subtitle ?? undefined)
                      }
                      imageUrl={guide.hero_image_url}
                      analyticsCategory="guides_hub_cluster"
                    />
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {unmappedGuides.length > 0 ? (
        <section className="py-14">
          <div className="mx-auto max-w-6xl px-4">
            <header className="mb-8 space-y-2">
              <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                More guides
              </h2>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unmappedGuides.map((guide) => (
                <GuideCard
                  key={guide.slug}
                  title={guide.title}
                  slug={guide.slug}
                  subtitle={guide.subtitle ?? undefined}
                  imageUrl={guide.hero_image_url}
                  analyticsCategory="guides_hub"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {allGuides.length === 0 && (
        <section className="py-14">
          <p className="text-center text-[var(--color-text-secondary)]">No guides found.</p>
        </section>
      )}
    </div>
  );
}
