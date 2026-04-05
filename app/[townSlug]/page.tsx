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
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { RecommendationCarousel } from "@/components/discovery/RecommendationCarousel";
import { TownRecList } from "@/components/discovery/TownRecList";
import { CategoryGrid } from "@/components/discovery/CategoryGrid";
import { TownHubSearch } from "@/components/TownHubSearch";
import { TownHubPrompts } from "@/components/TownHubPrompts";
import { AdjacentBusinessCarousel } from "@/components/discovery/AdjacentBusinessCarousel";

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

export default async function TownOrRegionPage({ params }: Props) {
  const { townSlug } = await params;
  if (isReservedRootSlug(townSlug)) notFound();

  const region = await getRegionBySlug(townSlug);
  if (region) {
    const towns = await getTownsInRegion(region.id);
    return (
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-12">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Region
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            {region.name}
          </h1>
          <p className="text-lg text-zinc-600">
            Pick a town for a curated local guide, or ask our AI from the home page.
          </p>
          <Link
            href="/"
            className="inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            AI search
          </Link>
        </header>
        <SectionBlock title="Towns along 30A">
          <div className="grid gap-4 sm:grid-cols-2">
            {towns.map((t) => (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className="rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] p-5 shadow-sm transition hover:border-[var(--accent)]/40"
              >
                <p className="font-semibold text-zinc-900">{t.name}</p>
                <p className="text-sm text-zinc-500">Town guide</p>
              </Link>
            ))}
          </div>
        </SectionBlock>
      </div>
    );
  }

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
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-12">
      <header className="space-y-4 border-b border-zinc-200/80 pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Town guide
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          {town.name}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-zinc-600">{vibe}</p>
        <TownHubSearch townName={town.name} />
      </header>

      {expanded.topPicks?.recommendations?.length ? (
        <RecommendationCarousel title="Top picks" subtitle="Strongest overall dining recommendations">
          <TownRecList enriched={expanded.topPicks} />
        </RecommendationCarousel>
      ) : null}

      {expanded.coffee?.recommendations?.length ? (
        <RecommendationCarousel title="Best coffee">
          <TownRecList enriched={expanded.coffee} />
        </RecommendationCarousel>
      ) : null}

      {expanded.casualLunch?.recommendations?.length ? (
        <RecommendationCarousel title="Casual lunch">
          <TownRecList enriched={expanded.casualLunch} />
        </RecommendationCarousel>
      ) : null}

      {expanded.dateNight?.recommendations?.length ? (
        <RecommendationCarousel title="Date night">
          <TownRecList enriched={expanded.dateNight} />
        </RecommendationCarousel>
      ) : null}

      {expanded.kidFriendly?.recommendations?.length ? (
        <RecommendationCarousel title="Kid-friendly">
          <TownRecList enriched={expanded.kidFriendly} />
        </RecommendationCarousel>
      ) : null}

      {expanded.quickBites?.recommendations?.length ? (
        <RecommendationCarousel title="Quick bites">
          <TownRecList enriched={expanded.quickBites} />
        </RecommendationCarousel>
      ) : null}

      <AdjacentBusinessCarousel businesses={nearbyBiz} />

      {adjacent.length ? (
        <SectionBlock
          title="Nearby towns"
          subtitle="Jump to another local guide"
        >
          <ul className="flex flex-wrap gap-3">
            {adjacent.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/${t.slug}`}
                  className="rounded-full border border-zinc-200/90 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:border-[var(--accent)]/40"
                >
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </SectionBlock>
      ) : null}

      <SectionBlock title="Browse by category" subtitle="Opens AI search with this town in mind">
        <CategoryGrid categories={categoryLinks} />
      </SectionBlock>

      <section className="rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Ask anything about {town.name}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Go deeper with natural language — same engine as the home search.
        </p>
        <div className="mt-4">
          <TownHubPrompts townName={town.name} />
        </div>
      </section>

      <SectionBlock title={`The ${town.name} vibe`} subtitle="Quick context from our editors">
        <p className="text-sm leading-relaxed text-zinc-600">{vibe}</p>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-600">
          <li>Start with Top picks, then narrow by intent rows above.</li>
          <li>
            Save places from search results on the home page after you sign in.
          </li>
          <li>Nearby cards show what&apos;s a short drive — still part of the 30A story.</li>
        </ul>
      </SectionBlock>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/" className="font-medium text-[var(--accent)] hover:underline">
          ← WhereTo30A home
        </Link>
      </p>
    </div>
  );
}
