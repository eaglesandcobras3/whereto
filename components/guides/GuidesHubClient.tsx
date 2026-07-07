"use client";

import Link from "next/link";
import { GuideCard } from "@/components/discovery/GuideCard";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { useSeoImprovementsFeatureEnabled } from "@/lib/feature-flags-client-utils";
import { pickDailySubset } from "@/lib/home/daily-featured-pick";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { hubGuidesIntro, hubGuidesClusterIntro } from "@/lib/seo/page-intro-copy";
import { PRIMARY_EDITORIAL_GUIDE_PATH, PRIMARY_EDITORIAL_GUIDE_SLUG } from "@/lib/seo/sitemap-strategy";
import {
  GUIDE_INTENT_CLUSTER_LABELS,
  type GuideIntentCluster,
  guideIntentForSlug,
  guidesByCluster,
} from "@/lib/seo/guide-intent-clusters";

const DAILY_FEATURED_LIMIT = 6;

const CLUSTER_ORDER: GuideIntentCluster[] = [
  "first_timer",
  "beach_access",
  "family_travel",
  "girls_trip",
  "town_guide",
  "logistics",
  "editorial",
];

export type GuidesHubGuideRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

type Props = {
  allGuides: GuidesHubGuideRow[];
};

function PlanningGuideCard({ guide }: { guide: GuidesHubGuideRow }) {
  return (
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
            <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-2xl">
              {guide.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {guide.subtitle ||
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
  );
}

export function GuidesHubClient({ allGuides }: Props) {
  const seoImprovements = useSeoImprovementsFeatureEnabled();
  const planningGuide = allGuides.find((g) => g.slug === PRIMARY_EDITORIAL_GUIDE_SLUG);

  if (!seoImprovements) {
    const featuredGuides = pickDailySubset(allGuides, DAILY_FEATURED_LIMIT);
    const featuredSlugSet = new Set(featuredGuides.map((g) => g.slug));
    const moreGuides = allGuides.filter((g) => !featuredSlugSet.has(g.slug));

    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <BrowseHubHero
          title="Travel guides"
          description="Editorial guides for planning your trip: town picks, dining, beaches, and local advice written for the Emerald Coast."
          collapsibleDescription={hubGuidesIntro()}
        />

        {planningGuide ? <PlanningGuideCard guide={planningGuide} /> : null}

        {featuredGuides.length > 0 ? (
          <section className="border-b border-[var(--color-border)] py-14">
            <div className="mx-auto max-w-6xl px-4">
              <header className="mb-8 space-y-2">
                <p className="text-eyebrow">Editor&apos;s picks</p>
                <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                  Featured today
                </h2>
              </header>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredGuides.map((guide) => (
                  <GuideCard
                    key={guide.slug}
                    title={guide.title}
                    slug={guide.slug}
                    subtitle={guide.subtitle ?? undefined}
                    imageUrl={guide.hero_image_url}
                    analyticsCategory="guides_hub_featured"
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {moreGuides.length > 0 ? (
          <section className="py-14">
            <div className="mx-auto max-w-6xl px-4">
              <header className="mb-8 space-y-2">
                <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                  {featuredGuides.length > 0 ? "More guides" : "All guides"}
                </h2>
                <p className="text-[var(--color-text-secondary)]">
                  {allGuides.length} {allGuides.length === 1 ? "guide" : "guides"} for dining, towns,
                  beaches, and trip planning.
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {moreGuides.map((guide) => (
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

        {allGuides.length === 0 ? (
          <section className="py-14">
            <p className="text-center text-[var(--color-text-secondary)]">No guides found.</p>
          </section>
        ) : null}
      </div>
    );
  }

  const slugList = allGuides.map((g) => g.slug);
  const clustered = guidesByCluster(slugList);
  const mappedSlugs = new Set(
    Object.values(clustered)
      .flat()
      .map((m) => m.slug),
  );
  const unmappedGuides = allGuides.filter((g) => !mappedSlugs.has(g.slug));

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
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

      {planningGuide ? <PlanningGuideCard guide={planningGuide} /> : null}

      {CLUSTER_ORDER.map((cluster) => {
        const mappings = clustered[cluster];
        if (!mappings?.length) return null;
        const guidesInCluster = mappings
          .map((m) => allGuides.find((g) => g.slug === m.slug))
          .filter((g): g is GuidesHubGuideRow => Boolean(g));
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

      {allGuides.length === 0 ? (
        <section className="py-14">
          <p className="text-center text-[var(--color-text-secondary)]">No guides found.</p>
        </section>
      ) : null}
    </div>
  );
}
