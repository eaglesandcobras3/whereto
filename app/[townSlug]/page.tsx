import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import {
  getAdjacentTownBusinessPreviews,
  getAdjacentTownNames,
  getRegionBySlug,
  getTownBySlug,
  getTownHubExpandedSections,
  getTownsInRegion,
} from "@/lib/data/town-hub";
import { getTownDescriptor, getRegionDescriptor } from "@/lib/data/town-descriptors";
import { Navbar } from "@/components/Navbar";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { RecommendationCarousel } from "@/components/discovery/RecommendationCarousel";
import { TownRecList } from "@/components/discovery/TownRecList";
import { TownCard } from "@/components/discovery/TownCard";
import { CategoryGrid } from "@/components/discovery/CategoryGrid";
import { TownHubSearch } from "@/components/TownHubSearch";
import { TownHubPrompts } from "@/components/TownHubPrompts";
import { AdjacentBusinessCarousel } from "@/components/discovery/AdjacentBusinessCarousel";
import { SiteFooter } from "@/components/home/SiteFooter";

export const revalidate = 3600;

type Props = { params: Promise<{ townSlug: string }> };

export async function generateStaticParams() {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  const [{ data: towns }, { data: regions }] = await Promise.all([
    supabase.from("towns").select("slug"),
    supabase.from("regions").select("slug"),
  ]);
  const slugs = new Set<string>();
  for (const t of towns ?? []) {
    const s = t.slug as string;
    if (s) slugs.add(s);
  }
  for (const r of regions ?? []) {
    const s = r.slug as string;
    if (s) slugs.add(s);
  }
  return [...slugs]
    .filter((s) => !isReservedRootSlug(s))
    .map((townSlug) => ({ townSlug }));
}

/** Intent pills for quick navigation */
const INTENT_PILLS = [
  { name: "Brunch", slug: "brunch" },
  { name: "Lunch", slug: "lunch" },
  { name: "Dinner", slug: "dinner" },
  { name: "Coffee", slug: "coffee" },
  { name: "Date Night", slug: "date-night" },
  { name: "Kid-Friendly", slug: "kid-friendly" },
  { name: "Quick Bites", slug: "quick-bites" },
  { name: "Bars", slug: "bars" },
];

export default async function TownOrRegionPage({ params }: Props) {
  const { townSlug } = await params;
  if (isReservedRootSlug(townSlug)) notFound();

  // Check if this is a region
  const region = await getRegionBySlug(townSlug);
  if (region) {
    const towns = await getTownsInRegion(region.id);
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <Navbar />

        {/* Hero */}
        <div className="coastal-hero border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
            <header className="space-y-4 text-center">
              <p className="text-eyebrow">Region</p>
              <h1 className="text-hero text-[var(--color-text-primary)]">
                {region.name}
              </h1>
              <p className="mx-auto max-w-xl text-lg text-[var(--color-text-secondary)]">
                {getRegionDescriptor(region.slug)}
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-light)] transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  AI Search
                </Link>
              </div>
            </header>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
          <SectionBlock
            title={`Towns in ${region.name}`}
            subtitle="Pick a town for a curated local guide"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {towns.map((t) => (
                <TownCard
                  key={t.slug}
                  name={t.name}
                  slug={t.slug}
                  subtitle={getTownDescriptor(t.slug)}
                />
              ))}
            </div>
          </SectionBlock>
        </div>

        <SiteFooter />
      </div>
    );
  }

  // This is a town page
  const town = await getTownBySlug(townSlug);
  if (!town) notFound();

  const [adjacent, expanded, nearbyBiz] = await Promise.all([
    getAdjacentTownNames(town.id),
    getTownHubExpandedSections(town.slug, town.name),
    getAdjacentTownBusinessPreviews(town.id, 10),
  ]);

  const categoryLinks = [
    {
      slug: "restaurants",
      name: "Restaurants",
      href: `/?q=${encodeURIComponent(`restaurants in ${town.name}`)}`,
    },
    {
      slug: "coffee",
      name: "Coffee",
      href: `/?q=${encodeURIComponent(`coffee in ${town.name}`)}`,
    },
    {
      slug: "things",
      name: "Things to do",
      href: `/?q=${encodeURIComponent(`things to do ${town.name}`)}`,
    },
    {
      slug: "shopping",
      name: "Shopping",
      href: `/?q=${encodeURIComponent(`shopping in ${town.name}`)}`,
    },
    {
      slug: "services",
      name: "Services",
      href: `/?q=${encodeURIComponent(`spas and services in ${town.name}`)}`,
    },
  ];

  const vibe = getTownDescriptor(town.slug);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Navbar />

      {/* Hero Section */}
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <header className="space-y-4 text-center">
            <p className="text-eyebrow">Town Guide</p>
            <h1 className="text-hero text-[var(--color-text-primary)]">
              {town.name}
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              {vibe}
            </p>
          </header>

          {/* Search */}
          <div className="mt-8">
            <TownHubSearch townName={town.name} />
          </div>

          {/* Intent Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {INTENT_PILLS.map((intent) => (
              <Link
                key={intent.slug}
                href={`/${townSlug}/${intent.slug}`}
                className="
                  rounded-full border border-[var(--color-border-strong)]
                  bg-[var(--color-surface)] px-4 py-2
                  text-sm font-medium text-[var(--color-text-primary)]
                  shadow-premium-sm
                  transition-premium-fast
                  hover:border-[var(--color-primary)]/40
                  hover:bg-[var(--color-surface-secondary)]
                  hover:text-[var(--color-primary)]
                "
              >
                {intent.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {/* Top Picks */}
        {expanded.topPicks?.recommendations?.length ? (
          <RecommendationCarousel
            title="Top picks"
            subtitle="Strongest overall dining recommendations"
            seeAllHref={`/${townSlug}/restaurants`}
          >
            <TownRecList enriched={expanded.topPicks} />
          </RecommendationCarousel>
        ) : null}

        {/* Coffee */}
        {expanded.coffee?.recommendations?.length ? (
          <RecommendationCarousel
            title="Best coffee"
            subtitle="Espresso, cold brew, and morning vibes"
            seeAllHref={`/${townSlug}/coffee`}
          >
            <TownRecList enriched={expanded.coffee} />
          </RecommendationCarousel>
        ) : null}

        {/* Casual Lunch */}
        {expanded.casualLunch?.recommendations?.length ? (
          <RecommendationCarousel
            title="Casual lunch"
            subtitle="Perfect for midday bites"
            seeAllHref={`/${townSlug}/lunch`}
          >
            <TownRecList enriched={expanded.casualLunch} />
          </RecommendationCarousel>
        ) : null}

        {/* Date Night */}
        {expanded.dateNight?.recommendations?.length ? (
          <RecommendationCarousel
            title="Date night"
            subtitle="Romantic spots for special evenings"
            seeAllHref={`/${townSlug}/date-night`}
          >
            <TownRecList enriched={expanded.dateNight} />
          </RecommendationCarousel>
        ) : null}

        {/* Kid-Friendly */}
        {expanded.kidFriendly?.recommendations?.length ? (
          <RecommendationCarousel
            title="Kid-friendly"
            subtitle="Family-approved dining"
            seeAllHref={`/${townSlug}/kid-friendly`}
          >
            <TownRecList enriched={expanded.kidFriendly} />
          </RecommendationCarousel>
        ) : null}

        {/* Quick Bites */}
        {expanded.quickBites?.recommendations?.length ? (
          <RecommendationCarousel
            title="Quick bites"
            subtitle="Grab and go options"
            seeAllHref={`/${townSlug}/quick-bites`}
          >
            <TownRecList enriched={expanded.quickBites} />
          </RecommendationCarousel>
        ) : null}

        {/* Worth the Drive - Adjacent Businesses */}
        <AdjacentBusinessCarousel businesses={nearbyBiz} />

        {/* Nearby Towns */}
        {adjacent.length ? (
          <SectionBlock
            title="Nearby towns"
            subtitle="More guides just a short drive away"
          >
            <div className="flex flex-wrap gap-3">
              {adjacent.map((t) => (
                <Link
                  key={t.slug}
                  href={`/${t.slug}`}
                  className="
                    rounded-full border border-[var(--color-border-strong)]
                    bg-[var(--color-surface)] px-5 py-2.5
                    text-sm font-medium text-[var(--color-text-primary)]
                    shadow-premium-sm
                    transition-premium hover-lift
                    hover:border-[var(--color-primary)]/40
                  "
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </SectionBlock>
        ) : null}

        {/* Browse by Category */}
        <SectionBlock
          title="Browse by category"
          subtitle="Opens AI search with this town in mind"
        >
          <CategoryGrid categories={categoryLinks} />
        </SectionBlock>

        {/* AI Search Section */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-premium-sm sm:p-8">
          <h2 className="text-section text-[var(--color-text-primary)]">
            Ask anything about {town.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Go deeper with natural language — same engine as the home search.
          </p>
          <div className="mt-4">
            <TownHubPrompts townName={town.name} />
          </div>
        </section>

        {/* Town Vibe Section */}
        <SectionBlock
          title={`The ${town.name} vibe`}
          subtitle="Quick context from our editors"
        >
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-6">
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {vibe}
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>Start with Top picks, then narrow by intent rows above.</li>
              <li>
                Save places from search results on the home page after you sign
                in.
              </li>
              <li>
                Nearby cards show what&apos;s a short drive — still part of the
                coastal story.
              </li>
            </ul>
          </div>
        </SectionBlock>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            WhereTo30A home
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
