import { notFound } from "next/navigation";
import { getTownBySlug, getTownsInRegion } from "@/lib/data/town-hub";
import { getRegionBySlug } from "@/lib/data/town-hub";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BusinessCard } from "@/components/discovery/BusinessCard";
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

  // Fetch featured businesses for this town
  const { data: businesses } = await supabase
    .from("businesses")
    .select(`
      id, name, slug, hero_image_url, ai_summary, status, confidence_score,
      categories(name)
    `)
    .eq("town_id", town.id)
    .eq("status", "active")
    .order("confidence_score", { ascending: false })
    .limit(12);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar compact />

      <main className="flex-1">
        {/* Town Hero / Search */}
        <section className="coastal-hero border-b border-[var(--color-border)] py-20 text-center">
          <div className="mx-auto max-w-4xl px-4">
            <p className="text-eyebrow mb-2">Town Guide</p>
            <h1 className="text-hero text-[var(--color-text-primary)] mb-8">
              {town.name}
            </h1>
            
            <form
              action="/search"
              method="GET"
              className="mx-auto flex w-full max-w-[600px] gap-2"
            >
              <input type="hidden" name="town_id" value={town.id} />
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-primary/40">
                  search
                </span>
                <input
                  name="q"
                  placeholder={`Search in ${town.name}...`}
                  className="h-14 w-full rounded-2xl border-none bg-white pl-14 pr-8 text-lg text-on-surface shadow-premium-sm focus:ring-2 focus:ring-primary/10"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="h-14 rounded-2xl bg-primary px-8 font-bold text-on-primary transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Featured Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
          <div className="mb-12">
            <h2 className="font-headline text-3xl font-extrabold tracking-tighter text-primary">
              Featured in {town.name}
            </h2>
            <p className="mt-2 text-on-surface-variant">The absolute best of this coastal neighborhood.</p>
          </div>

          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(businesses ?? []).map((b) => (
              <BusinessCard
                key={b.id}
                rec={{
                  business_id: b.id,
                  rank: 1,
                  headline: (b.categories as any)?.name ?? "Local Favorite",
                  explanation: b.ai_summary || "Explore the best of the coast.",
                  highlighted_tags: [],
                  business: {
                    id: b.id,
                    name: b.name,
                    slug: b.slug,
                    image_url: b.hero_image_url,
                    ai_summary: b.ai_summary,
                    category_name: (b.categories as any)?.name
                  }
                }}
              />
            ))}
          </ul>

          {(businesses ?? []).length === 0 && (
            <div className="py-20 text-center text-on-surface-variant">
              <p>No businesses found in this area yet. Stay tuned for updates!</p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
