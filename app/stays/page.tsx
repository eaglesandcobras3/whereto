import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { RentalCard } from "@/components/stays/RentalCard";
import { ListRentalsHomeCta } from "@/components/stays/ListRentalsHomeCta";
import { StaysResults } from "@/components/stays/StaysResults";
import { StaysSearchForm } from "@/components/stays/StaysSearchForm";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { executeRentalSearch } from "@/lib/stays/execute-search";
import { parseRentalSearchParams } from "@/lib/stays/search-params";
import { staysFilteredMetadata, staysHubMetadata } from "@/lib/stays/seo";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** ISR — same cadence as business listings. */
export const revalidate = 21600;
export const dynamicParams = true;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const plan = parseRentalSearchParams(sp);
  return plan.hasFilters ? staysFilteredMetadata() : staysHubMetadata();
}

export default async function StaysPage({ searchParams }: Props) {
  const flags = await getAllFeatureFlags();
  if (!isRentalsFeatureEnabled(flags)) notFound();

  const sp = await searchParams;
  const plan = parseRentalSearchParams(sp);

  let items: Awaited<ReturnType<typeof executeRentalSearch>>["items"] = [];
  let total = 0;
  try {
    const result = await executeRentalSearch(plan);
    items = result.items;
    total = result.total;
  } catch {
    // Tables may not exist until migration applied.
  }

  const supabase = getServiceSupabase();
  const [{ data: towns }, { data: areas }] = await Promise.all([
    supabase
      .from("towns")
      .select("id, slug, title")
      .eq("status", "published")
      .order("title", { ascending: true })
      .limit(80),
    supabase
      .from("areas")
      .select("id, slug, title")
      .eq("status", "published")
      .order("title", { ascending: true })
      .limit(120),
  ]);

  const featured = items.filter((i) => i.featured).slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <BrowseHubHero
          title="Stays"
          description="Find your 30A stay and book directly with trusted local rental companies. Compare homes by town, bedrooms, and beach access — then check availability on the property manager’s own booking site."
          meta={
            <>
              {total} {total === 1 ? "stay" : "stays"}
            </>
          }
        />

        <section className="mx-auto max-w-6xl px-4 py-8 md:px-10">
          <StaysSearchForm
            initial={plan}
            towns={(towns ?? []) as { id: string; slug: string; title: string }[]}
            areas={(areas ?? []) as { id: string; slug: string; title: string }[]}
          />

          {featured.length > 0 && !plan.hasFilters ? (
            <div className="mt-12">
              <h2 className="font-headline text-xl font-semibold text-zinc-900">
                Curated collections
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Editor picks — separate from organic search ranking.
              </p>
              <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((p, i) => (
                  <RentalCard key={p.id} property={p} position={i + 1} />
                ))}
              </div>
            </div>
          ) : null}

          <StaysResults items={items} total={total} />
        </section>

        <ListRentalsHomeCta />
      </main>
    </div>
  );
}
