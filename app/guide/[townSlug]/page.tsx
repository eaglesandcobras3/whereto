import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/home/SiteFooter";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ townSlug: string }>;
};

type Town = {
  id: number;
  name: string;
  slug: string;
  ai_tagline: string | null;
  ai_description: string | null;
  ai_vibe: string[] | null;
  ai_known_for: string[] | null;
  ai_best_for: string[] | null;
  ai_not_ideal_for: string[] | null;
  ai_best_time_to_visit: string[] | null;
  ai_parking_situation: string | null;
  ai_walkability: string | null;
  ai_must_see: string[] | null;
  ai_hidden_gems: string[] | null;
  ai_local_tips: string[] | null;
  ai_food_scene: string | null;
  ai_nightlife: string | null;
  ai_family_activities: string[] | null;
  ai_romantic_spots: string[] | null;
  ai_nearby_towns: string[] | null;
  ai_day_trip_ideas: string[] | null;
  ai_family_score: number | null;
  ai_romance_score: number | null;
  ai_nightlife_score: number | null;
  ai_budget_score: number | null;
};

type Business = {
  id: string;
  name: string;
  slug: string;
  ai_one_liner: string | null;
  categories: { name: string } | { name: string }[] | null;
};

async function getTown(slug: string): Promise<Town | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as Town | null;
}

async function getTownBusinesses(townId: number): Promise<Business[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("businesses")
    .select("id, name, slug, ai_one_liner, categories(name)")
    .eq("town_id", townId)
    .eq("status", "active")
    .order("confidence_score", { ascending: false })
    .limit(12);
  return (data ?? []) as Business[];
}

async function getNearbyTowns(slug: string): Promise<{ name: string; slug: string }[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select("name, slug")
    .neq("slug", slug)
    .limit(5);
  return (data ?? []) as { name: string; slug: string }[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug } = await params;
  const town = await getTown(townSlug);
  if (!town) return { title: "Town Guide | WhereTo30A" };

  const description =
    town.ai_description ||
    `Complete guide to ${town.name}, Florida. Discover the best restaurants, activities, and local tips for your 30A vacation.`;

  return {
    title: `${town.name} Florida Guide 2026 | Things to Do, Restaurants & Tips`,
    description,
    keywords: [
      `${town.name} Florida`,
      `${town.name} restaurants`,
      `${town.name} things to do`,
      `${town.name} vacation`,
      `${town.name} 30A`,
      "30A Florida",
      "Emerald Coast",
    ],
    openGraph: {
      title: `${town.name} Florida Vacation Guide | WhereTo30A`,
      description,
      type: "article",
      url: `https://whereto30a.com/guide/${town.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const supabase = getServiceSupabase();
  const { data } = await supabase.from("towns").select("slug");
  return (data ?? []).map((t) => ({ townSlug: t.slug }));
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-[var(--color-text-tertiary)]">
        {icon}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">{label}</span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {score}/10
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)]"
            style={{ width: `${score * 10}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <section className="py-12 border-b border-[var(--color-border)] last:border-0">
      <h2 className="flex items-center gap-3 font-headline text-2xl font-bold text-[var(--color-text-primary)]">
        {icon && (
          <span className="material-symbols-outlined text-[var(--color-primary)]">
            {icon}
          </span>
        )}
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ListSection({ items, emptyText }: { items: string[] | null; emptyText?: string }) {
  if (!items || items.length === 0) {
    return emptyText ? (
      <p className="text-[var(--color-text-tertiary)] italic">{emptyText}</p>
    ) : null;
  }
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
          <span className="text-[var(--color-text-secondary)]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function TownGuidePage({ params }: Props) {
  const { townSlug } = await params;
  const town = await getTown(townSlug);
  if (!town) notFound();

  const [businesses, nearbyTowns] = await Promise.all([
    getTownBusinesses(town.id),
    getNearbyTowns(town.slug),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: town.name,
    description: town.ai_description || `Beach community on Florida's 30A`,
    address: {
      "@type": "PostalAddress",
      addressLocality: town.name,
      addressRegion: "FL",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 30.3,
      longitude: -86.1,
    },
    touristType: town.ai_best_for || ["Beach", "Family", "Relaxation"],
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar compact />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[450px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[var(--color-background)]" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920')] bg-cover bg-center" />
          <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-12">
            <Link
              href="/guide"
              className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-white/80 hover:text-white"
            >
              <span className="material-symbols-outlined !text-sm">
                arrow_back
              </span>
              Back to 30A Guide
            </Link>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              {town.name}
            </h1>
            {town.ai_tagline && (
              <p className="mt-3 text-xl text-white/90">{town.ai_tagline}</p>
            )}
            {town.ai_vibe && town.ai_vibe.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {town.ai_vibe.map((v) => (
                  <span
                    key={v}
                    className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Content */}
        <div className="mx-auto max-w-5xl px-6">
          {/* Scores */}
          {(town.ai_family_score ||
            town.ai_romance_score ||
            town.ai_nightlife_score ||
            town.ai_budget_score) && (
            <section className="grid gap-6 border-b border-[var(--color-border)] py-12 md:grid-cols-2 lg:grid-cols-4">
              {town.ai_family_score && (
                <ScoreBar
                  label="Family Friendly"
                  score={town.ai_family_score}
                  icon="family_restroom"
                />
              )}
              {town.ai_romance_score && (
                <ScoreBar
                  label="Romance"
                  score={town.ai_romance_score}
                  icon="favorite"
                />
              )}
              {town.ai_nightlife_score && (
                <ScoreBar
                  label="Nightlife"
                  score={town.ai_nightlife_score}
                  icon="nightlife"
                />
              )}
              {town.ai_budget_score && (
                <ScoreBar
                  label="Budget Friendly"
                  score={town.ai_budget_score}
                  icon="savings"
                />
              )}
            </section>
          )}

          {/* Overview */}
          {town.ai_description && (
            <Section title="About" icon="info">
              <p className="text-lg leading-relaxed text-[var(--color-text-secondary)]">
                {town.ai_description}
              </p>
            </Section>
          )}

          {/* Known For */}
          {town.ai_known_for && town.ai_known_for.length > 0 && (
            <Section title="Known For" icon="star">
              <div className="flex flex-wrap gap-3">
                {town.ai_known_for.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Best For / Not Ideal For */}
          <div className="grid gap-8 border-b border-[var(--color-border)] py-12 md:grid-cols-2">
            {town.ai_best_for && town.ai_best_for.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[var(--color-text-primary)]">
                  <span className="material-symbols-outlined text-green-600">
                    check_circle
                  </span>
                  Best For
                </h3>
                <div className="mt-4">
                  <ListSection items={town.ai_best_for} />
                </div>
              </div>
            )}
            {town.ai_not_ideal_for && town.ai_not_ideal_for.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[var(--color-text-primary)]">
                  <span className="material-symbols-outlined text-amber-600">
                    info
                  </span>
                  Consider Elsewhere If
                </h3>
                <div className="mt-4">
                  <ListSection items={town.ai_not_ideal_for} />
                </div>
              </div>
            )}
          </div>

          {/* Must See */}
          {town.ai_must_see && town.ai_must_see.length > 0 && (
            <Section title="Must-See Spots" icon="place">
              <ListSection items={town.ai_must_see} />
            </Section>
          )}

          {/* Hidden Gems */}
          {town.ai_hidden_gems && town.ai_hidden_gems.length > 0 && (
            <Section title="Hidden Gems" icon="diamond">
              <ListSection items={town.ai_hidden_gems} />
            </Section>
          )}

          {/* Food & Dining */}
          {town.ai_food_scene && (
            <Section title="Food & Dining" icon="restaurant">
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {town.ai_food_scene}
              </p>
            </Section>
          )}

          {/* Practical Info */}
          <div className="grid gap-8 border-b border-[var(--color-border)] py-12 md:grid-cols-2">
            {town.ai_parking_situation && (
              <div>
                <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[var(--color-text-primary)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)]">
                    local_parking
                  </span>
                  Parking
                </h3>
                <p className="mt-3 text-[var(--color-text-secondary)]">
                  {town.ai_parking_situation}
                </p>
              </div>
            )}
            {town.ai_walkability && (
              <div>
                <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[var(--color-text-primary)]">
                  <span className="material-symbols-outlined text-[var(--color-primary)]">
                    directions_walk
                  </span>
                  Walkability
                </h3>
                <p className="mt-3 text-[var(--color-text-secondary)]">
                  {town.ai_walkability}
                </p>
              </div>
            )}
          </div>

          {/* Local Tips */}
          {town.ai_local_tips && town.ai_local_tips.length > 0 && (
            <Section title="Local Tips" icon="tips_and_updates">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <ListSection items={town.ai_local_tips} />
              </div>
            </Section>
          )}

          {/* Family Activities */}
          {town.ai_family_activities && town.ai_family_activities.length > 0 && (
            <Section title="Family Activities" icon="family_restroom">
              <ListSection items={town.ai_family_activities} />
            </Section>
          )}

          {/* Romantic Spots */}
          {town.ai_romantic_spots && town.ai_romantic_spots.length > 0 && (
            <Section title="Romantic Spots" icon="favorite">
              <ListSection items={town.ai_romantic_spots} />
            </Section>
          )}

          {/* Businesses */}
          {businesses.length > 0 && (
            <Section title={`Popular in ${town.name}`} icon="storefront">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {businesses.map((b) => (
                  <Link
                    key={b.id}
                    href={`/business/${b.slug}`}
                    className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-primary)] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                          {b.name}
                        </h4>
                        {b.categories && (
                          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                            {Array.isArray(b.categories)
                              ? b.categories[0]?.name
                              : b.categories.name}
                          </p>
                        )}
                      </div>
                      <span className="material-symbols-outlined !text-sm text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </div>
                    {b.ai_one_liner && (
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                        {b.ai_one_liner}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link
                  href={`/search?q=things+to+do+in+${encodeURIComponent(town.name)}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
                >
                  Search all in {town.name}
                  <span className="material-symbols-outlined !text-sm">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </Section>
          )}

          {/* Nearby Towns */}
          {nearbyTowns.length > 0 && (
            <section className="py-12">
              <h2 className="flex items-center gap-3 font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                <span className="material-symbols-outlined text-[var(--color-primary)]">
                  explore
                </span>
                Explore Nearby
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {nearbyTowns.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/guide/${t.slug}`}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* CTA */}
        <section className="bg-[var(--color-primary)] py-12">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-headline text-2xl font-extrabold text-white">
              Planning a trip to {town.name}?
            </h2>
            <p className="mt-3 text-white/80">
              Search for restaurants, activities, and more with our AI-powered
              local guide.
            </p>
            <Link
              href={`/search?q=best+of+${encodeURIComponent(town.name)}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-[var(--color-primary)] transition-all hover:shadow-lg"
            >
              <span className="material-symbols-outlined">search</span>
              Explore {town.name}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
