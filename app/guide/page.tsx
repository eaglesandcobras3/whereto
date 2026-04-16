import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "30A Florida Vacation Guide 2026 | Local Guide to 30A Towns",
  description:
    "Your ultimate guide to Florida's 30A corridor. Explore Seaside, Rosemary Beach, Alys Beach, Grayton Beach and more. Local tips, best restaurants, activities, and hidden gems along the Emerald Coast.",
  keywords: [
    "30A Florida",
    "30A vacation guide",
    "Emerald Coast",
    "South Walton beaches",
    "Seaside Florida",
    "Rosemary Beach",
    "Alys Beach",
    "30A restaurants",
    "30A things to do",
  ],
  openGraph: {
    title: "30A Florida Vacation Guide 2026 | WhereTo30A",
    description:
      "Your complete guide to the Emerald Coast's beach communities. Local insights, dining recommendations, and hidden gems.",
    type: "website",
    url: "https://whereto30a.com/guide",
  },
};

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
    .is("primary_town_id", null)
    .limit(10);
  return data ?? [];
}

export default async function GuidePage() {
  const [towns, otherGuides] = await Promise.all([
    getTowns(),
    getOtherGuides(),
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
      url: `https://whereto30a.com/guide/${t.slug}`,
    })),
  };

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
        {/* Hero Section */}
        <section className="relative h-[500px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[var(--color-background)]" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920')] bg-cover bg-center" />
          <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-16">
            <span className="mb-4 inline-block w-fit rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
              Complete Vacation Guide
            </span>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white md:text-6xl">
              30A Florida Vacation Guide
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/90">
              Your insider&apos;s guide to the Emerald Coast&apos;s most beautiful beach
              communities. From Inlet Beach to Dune Allen Beach, discover the
              magic of South Walton.
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            What is 30A?
          </h2>
          <div className="mt-6 space-y-4 text-[var(--color-text-secondary)] leading-relaxed">
            <p>
              <strong className="text-[var(--color-text-primary)]">
                Highway 30A
              </strong>{" "}
              is a scenic coastal road that runs for 24 miles along the Gulf of
              Mexico in South Walton County, Florida. Often called the &ldquo;Emerald
              Coast&rdquo; for its stunning turquoise waters and sugar-white sand
              beaches, 30A has become one of the most sought-after vacation
              destinations in the United States.
            </p>
            <p>
              The 30A corridor is home to a collection of unique beach
              communities, each with its own distinct personality. From the
              European elegance of Rosemary Beach to the bohemian spirit of
              Grayton Beach, there&apos;s a perfect town for every type of traveler.
            </p>
            <p>
              Whether you&apos;re planning a romantic getaway, a family vacation, or
              a girls&apos; trip, this guide will help you discover the best of 30A &mdash;
              from hidden local restaurants to the most photogenic spots along
              the coast.
            </p>
          </div>
        </section>

        {/* Town Grid */}
        <section className="bg-[var(--color-surface-container-low)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
                Explore the Beach Communities
              </h2>
              <p className="mt-3 text-[var(--color-text-secondary)]">
              Click on any town to read our local guide
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {towns.map((town) => (
                <Link
                  key={town.id}
                  href={`/guide/${town.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="relative h-48 overflow-hidden bg-[var(--color-surface-container-high)]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined !text-6xl text-[var(--color-text-tertiary)] opacity-20">
                        beach_access
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-headline text-2xl font-bold text-white">
                        {town.name}
                      </h3>
                      {town.ai_tagline && (
                        <p className="mt-1 text-sm text-white/80 line-clamp-1">
                          {town.ai_tagline}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    {town.ai_description ? (
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3">
                        {town.ai_description}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Discover the charm of {town.name} on Florida&apos;s Emerald
                        Coast.
                      </p>
                    )}

                    {town.ai_vibe && town.ai_vibe.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
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

                    <div className="mt-4 flex items-center text-sm font-semibold text-[var(--color-primary)]">
                      Read Full Guide
                      <span className="material-symbols-outlined ml-1 !text-sm transition-transform group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </div>
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
                  href="/guide/alys-beach"
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Alys Beach
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/guide/rosemary-beach"
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
                  href="/guide/seaside"
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Seaside
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/guide/watercolor"
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
                  href="/guide/grayton-beach"
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Grayton Beach
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/guide/seaside"
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
                  href="/guide/santa-rosa-beach"
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Santa Rosa Beach
                </Link>
                <span className="text-[var(--color-text-tertiary)]">•</span>
                <Link
                  href="/guide/inlet-beach"
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

        {/* CTA */}
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
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-[var(--color-primary)] transition-all hover:shadow-lg"
            >
              <span className="material-symbols-outlined">search</span>
              Start Searching
            </Link>
          </div>
        </section>
    </>
  );
}
