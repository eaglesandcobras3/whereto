import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  getTownBySlug, 
  getTownsInRegion, 
  getRegionBySlug, 
  getAdjacentTownNames,
  getAdjacentTownBusinessPreviews,
  getTownHubExpandedSections
} from "@/lib/data/town-hub";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BusinessCard } from "@/components/discovery/BusinessCard";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { RegionHubView } from "@/components/region/RegionHubView";
import type { Metadata } from "next";

type Props = { params: Promise<{ townSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug } = await params;
  const town = await getTownBySlug(townSlug);
  if (!town) return { title: "Town Guide" };
  return {
    title: `${town.name} Local Guide — WhereTo30A`,
    description: `Discover the best restaurants, shops, and things to do in ${town.name}, FL. Curated local insights.`,
  };
}
export default async function TownPage({ params }: Props) {
  const { townSlug } = await params;
  if (isReservedRootSlug(townSlug)) notFound();

  const flags = await getAllFeatureFlags();
  const supabase = getServiceSupabase();

  // Check if this is a region
  const region = await getRegionBySlug(townSlug);
  if (region) {
    const towns = await getTownsInRegion(region.id);
    return <RegionHubView region={region} towns={towns} />;
  }

  // Fetch town data
  const town = await getTownBySlug(townSlug);
  if (!town) notFound();

  // Parallel fetch town data
  const [adjacent, expanded, nearbyBiz] = await Promise.all([
    getAdjacentTownNames(town.id),
    getTownHubExpandedSections(town.slug, town.name),
    getAdjacentTownBusinessPreviews(town.id, 10),
  ]);

  const descriptor = getTownDescriptor(town.slug);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar compact />

      <main className="flex-1 pb-32">
        {/* Town Hero */}
        <section className="relative h-[650px] w-full flex items-end overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* Placeholder for real town image, wire to DB later */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-background)] via-transparent to-black/30" />
            <div className="h-full w-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-[var(--color-text-tertiary)]">
               <span className="material-symbols-outlined !text-9xl opacity-10">beach_access</span>
            </div>
          </div>
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-16 md:px-10">
            <div className="max-w-2xl">
              <span className="inline-block bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
                TOWN EXPLORER
              </span>
              <h1 className="font-headline text-6xl md:text-8xl font-extrabold tracking-tighter text-[var(--color-text-primary)] mb-6">
                {town.name}
              </h1>
              <p className="text-lg md:text-xl text-[var(--color-text-secondary)] leading-relaxed max-w-lg">
                {descriptor}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-20 space-y-32 md:px-10">
          {/* Main sections from AI Curations */}
          {expanded.topPicks?.recommendations?.length > 0 && (
            <SectionBlock 
              title="Signature Dining" 
              subtitle={`From gourmet seafood to casual beach bites in ${town.name}.`}
            >
              <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-x-auto hide-scrollbar sm:grid">
                {expanded.topPicks.recommendations.slice(0, 4).map((rec) => (
                  <BusinessCard key={rec.business_id} rec={rec} variant="consumer" />
                ))}
              </ul>
            </SectionBlock>
          )}

          {expanded.coffee?.recommendations?.length > 0 && (
            <SectionBlock 
              title="Coffee & Sweets" 
              subtitle="The best local roasts and afternoon treats."
            >
              <ul className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                {expanded.coffee.recommendations.map((rec) => (
                  <li key={rec.business_id} className="min-w-[320px] snap-start">
                    <BusinessCard rec={rec} variant="consumer" />
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}

          {/* Worth the short drive */}
          {nearbyBiz.length > 0 && (
            <SectionBlock 
              title="Worth the short drive" 
              subtitle="Hand-picked favorites from neighboring towns — still on the coast."
            >
              <ul className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                {nearbyBiz.map((b) => (
                  <li key={b.id} className="min-w-[320px] snap-start group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-all hover:shadow-md">
                    <Link href={`/business/${b.slug}`} className="block relative aspect-video overflow-hidden">
                      {b.image_url ? (
                        <Image src={b.image_url} alt={b.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                      ) : (
                        <div className="h-full w-full bg-[var(--color-surface-container-high)] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[var(--color-text-tertiary)] opacity-30">storefront</span>
                        </div>
                      )}
                    </Link>
                    <div className="p-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">{b.townName}</p>
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{b.name}</h3>
                      <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)] mb-4">{b.ai_summary || "Explore more about this local favorite."}</p>
                      <Link href={`/business/${b.slug}`} className="text-sm font-bold text-[var(--color-primary)] flex items-center gap-1">
                        View Details <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}

          {/* Quick Town Search */}
          <section className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-12 md:p-20 text-center">
            <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-[var(--color-text-primary)] mb-6">
              Explore {town.name}
            </h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto mb-10 text-lg">
              Search for anything from &ldquo;best sunset view&rdquo; to &ldquo;kid-friendly lunch&rdquo; in this community.
            </p>
            <form
              action="/search"
              method="GET"
              className="mx-auto flex w-full max-w-[600px] gap-2"
            >
              <input type="hidden" name="town_id" value={town.id} />
              <div className="relative flex-1 text-left">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-primary/40">
                  search
                </span>
                <input
                  name="q"
                  placeholder={`What are you looking for in ${town.name}?`}
                  className="h-14 w-full rounded-2xl border-none bg-white pl-14 pr-8 text-base text-on-surface shadow-premium-sm focus:ring-2 focus:ring-primary/10 transition-all"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="h-14 rounded-full bg-[var(--color-primary)] px-8 font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Go
              </button>
            </form>
          </section>

          {/* Adjacent Towns Footer */}
          {adjacent.length > 0 && (
            <div className="pt-20 border-t border-[var(--color-border-strong)]">
              <h3 className="font-headline text-xs font-extrabold tracking-widest text-[var(--color-text-tertiary)] uppercase mb-8 text-center">
                Neighboring Coastal Towns
              </h3>
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                {adjacent.map((t) => (
                  <Link 
                    key={t.slug} 
                    href={`/${t.slug}`}
                    className="text-lg font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all decoration-2 underline-offset-8 hover:underline"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
