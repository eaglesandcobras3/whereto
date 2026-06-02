import Link from "next/link";
import Image from "next/image";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { loadHubMainGuideMarkdown } from "@/lib/data/load-hub-main-guide-markdown";
import { getHomeHeroSettings } from "@/lib/data/site-settings";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

export const revalidate = 3600;

const HUB_FEATURED_GUIDE_SLUG = "ultimate-30a-first-timers-guide";

const GUIDE_TITLE = "Complete Guide to Visiting 30A, Florida (2026)";
const GUIDE_DESCRIPTION =
  "A local-style guide to South Walton's 30A corridor: what it is, how to pick a town, beach access, airports, where to eat, and a simple first-trip rhythm. Straight talk for first-time visitors.";
const GUIDE_OG_TITLE = "Complete Guide to Visiting 30A, Florida | WhereTo30A";
const GUIDE_OG_DESCRIPTION =
  "Plan a first 30A trip with clear town picks, beach-access reality, and pacing that matches your crew.";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getHomeHeroSettings();
  return {
    ...canonicalAlternates("/guide"),
    title: GUIDE_TITLE,
    description: GUIDE_DESCRIPTION,
    keywords: [
      "30A Florida",
      "30A vacation guide",
      "Emerald Coast",
      "South Walton beaches",
      "Seaside Florida",
      "Rosemary Beach",
      "Alys Beach",
      "30A beach access",
      "where to stay on 30A",
    ],
    ...openGraphForPage({
      path: "/guide",
      title: GUIDE_OG_TITLE,
      description: GUIDE_OG_DESCRIPTION,
      imageUrl: hero.imageUrl,
    }),
  };
}

type Town = {
  id: number;
  name: string;
  slug: string;
  ai_tagline: string | null;
  ai_description: string | null;
  ai_vibe: string[] | null;
  ai_known_for: string[] | null;
  ai_family_score: number | null;
  ai_romance_score: number | null;
};

async function getTowns(): Promise<Town[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select(
      "id, name, slug, ai_tagline, ai_description, ai_vibe, ai_known_for, ai_family_score, ai_romance_score"
    )
    .order("name");
  return (data ?? []) as Town[];
}

async function getOtherGuides() {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("guides")
    .select("title, slug, guide_type")
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .neq("slug", HUB_FEATURED_GUIDE_SLUG)
    .neq("guide_type", "town")
    .order("title")
    .limit(10);
  return data ?? [];
}

export default async function GuidePage() {
  const [flags, towns, otherGuides, hubBody, heroSettings] = await Promise.all([
    getAllFeatureFlags(),
    getTowns(),
    getOtherGuides(),
    loadHubMainGuideMarkdown(),
    getHomeHeroSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: "30A Florida - Emerald Coast",
    description:
      "A scenic 24-mile stretch of Highway 30A along Florida's Gulf Coast, featuring pristine beaches, charming beach communities, and world-class dining.",
    touristType: ["Beach", "Family", "Romantic", "Adventure"],
    includesAttraction: towns.map((t) => ({
      "@type": "City",
      name: t.name,
      url: `https://whereto30a.com/${t.slug}`,
    })),
  };

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
        {/* Hero: same configurable image as home / HOME_HERO_IMAGE_URL */}
        <section className="relative min-h-[380px] w-full overflow-hidden border-b border-[var(--color-border)] md:min-h-[480px]">
          <div className="absolute inset-0 z-0">
            <Image
              src={heroSettings.imageUrl}
              alt="Scenic 30A coastline with sugar-white sand and Gulf water"
              fill
              className="object-cover object-center"
              sizes="100vw"
              priority
              unoptimized
            />
          </div>
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-black/35 to-[var(--color-background)]" />
          <div className="relative z-10 mx-auto max-w-3xl px-6 py-16 text-[var(--color-text-primary)] md:py-24">
            <span className="mb-5 inline-flex items-center rounded-full border border-white/35 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
              Local planning guide
            </span>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white drop-shadow-md md:text-5xl lg:text-[3.25rem] md:leading-[1.1]">
              The complete guide to visiting 30A, Florida
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/90">
              {heroSettings.subtitle}
            </p>
          </div>
        </section>

        {/* Main article (markdown; no stock or inline images) */}
        <section className="mx-auto max-w-3xl px-6 py-14 md:py-20">
          <MarkdownRenderer content={hubBody} />
        </section>

        {/* Town Grid */}
        <section className="bg-[var(--color-surface-container-low)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                Dive deeper by town
              </h2>
              <p className="mt-3 text-[var(--color-text-secondary)]">
                Each guide is written with on-the-ground detail to help you pick
                a place that fits your week.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {towns.map((town) => (
                <Link
                  key={town.id}
                  href={`/${town.slug}`}
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_towns",
                    label: town.slug,
                  })}
                  className="group flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                      >
                        <span className="material-symbols-outlined text-2xl">
                          beach_access
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-headline text-xl font-bold text-[var(--color-text-primary)]">
                          {town.name}
                        </h3>
                        {town.ai_tagline && (
                          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            {town.ai_tagline}
                          </p>
                        )}
                      </div>
                    </div>
                    {town.ai_description ? (
                      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-4">
                        {town.ai_description}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Local notes on {town.name} along Scenic 30A.
                      </p>
                    )}

                    {town.ai_vibe && town.ai_vibe.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {town.ai_vibe.slice(0, 3).map((v) => (
                          <span
                            key={v}
                            className="rounded-full bg-[var(--color-surface-container-high)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center text-sm font-semibold text-[var(--color-primary)]">
                    Read town guide
                    <span className="material-symbols-outlined ml-1 !text-sm transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Best For Section */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-12 text-center font-headline text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            Find Your Perfect 30A Town
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <span className="material-symbols-outlined text-rose-600">
                  favorite
                </span>
              </div>
              <h3 className="font-headline text-xl font-bold text-[var(--color-text-primary)]">
                Best for Romance
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Alys Beach and Rosemary Beach offer intimate dining, spa
                experiences, and stunning architecture perfect for couples.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/alys-beach"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "alys-beach",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Alys Beach
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/rosemary-beach"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "rosemary-beach",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Rosemary Beach
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <span className="material-symbols-outlined text-blue-600">
                  family_restroom
                </span>
              </div>
              <h3 className="font-headline text-xl font-bold text-[var(--color-text-primary)]">
                Best for Families
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Seaside and WaterColor have excellent amenities, bike paths, and
                kid-friendly restaurants perfect for family vacations.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/seaside"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "seaside",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Seaside
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/watercolor"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "watercolor",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  WaterColor
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <span className="material-symbols-outlined text-amber-600">
                  nightlife
                </span>
              </div>
              <h3 className="font-headline text-xl font-bold text-[var(--color-text-primary)]">
                Best for Nightlife
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Grayton Beach has the most vibrant bar scene, while Seaside
                offers upscale evening dining and live music.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/grayton-beach"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "grayton-beach",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Grayton Beach
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/seaside"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "seaside",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Seaside
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <span className="material-symbols-outlined text-green-600">
                  savings
                </span>
              </div>
              <h3 className="font-headline text-xl font-bold text-[var(--color-text-primary)]">
                Best Value
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Santa Rosa Beach and Inlet Beach offer great beach access and
                dining options at more accessible price points.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/santa-rosa-beach"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "santa-rosa-beach",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Santa Rosa Beach
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/inlet-beach"
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_best_for",
                    label: "inlet-beach",
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Inlet Beach
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Other Guides Section */}
        {otherGuides.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-20 border-t border-[var(--color-border)]">
            <h2 className="mb-12 text-center font-headline text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Traveler Resources
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guide/${guide.slug}`}
                  {...gaClickProps({
                    event: "nav_click",
                    category: "guide_resources",
                    label: guide.slug,
                  })}
                  className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition-all hover:shadow-md hover:border-[var(--color-primary)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-widest mt-1">
                        {guide.guide_type?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-zinc-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {flags["guide_hub_search_callout"] === true ? (
          <section className="bg-[var(--color-primary)] py-16">
            <div className="mx-auto max-w-3xl px-6 text-center">
              <h2 className="font-headline text-3xl font-extrabold text-white">
                Ready to Explore?
              </h2>
              <p className="mt-4 text-lg text-white/80">
                Search towns, restaurants, events, and local favorites across 30A.
              </p>
              <Link
                href="/"
                {...gaClickProps({
                  event: "cta_click",
                  category: "guide_cta",
                  label: "start_searching",
                })}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-[var(--color-primary)] transition-all hover:shadow-lg"
              >
                <span className="material-symbols-outlined">search</span>
                Start Searching
              </Link>
            </div>
          </section>
        ) : null}
    </>
  );
}
