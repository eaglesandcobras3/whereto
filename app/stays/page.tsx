import type { Metadata } from "next";
import Link from "next/link";
import { RentalCard } from "@/components/stays/RentalCard";
import { StaysResults } from "@/components/stays/StaysResults";
import { StaysSearchForm } from "@/components/stays/StaysSearchForm";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { executeRentalSearch } from "@/lib/stays/execute-search";
import { parseRentalSearchParams } from "@/lib/stays/search-params";
import { staysFilteredMetadata, staysHubMetadata } from "@/lib/stays/seo";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { notFound } from "next/navigation";

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
  const { data: towns } = await supabase
    .from("towns")
    .select("id, slug, title")
    .eq("status", "published")
    .order("title", { ascending: true })
    .limit(80);

  const featured = items.filter((i) => i.featured).slice(0, 6);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f0fdfa_0%,#ffffff_28%,#fff7ed_100%)]">
      <section className="relative overflow-hidden border-b border-teal-100/80">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(13,148,136,0.18), transparent 45%), radial-gradient(circle at 80% 0%, rgba(251,146,60,0.12), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:pt-20">
          <p className="font-headline text-3xl font-bold tracking-tight text-teal-950 sm:text-5xl">
            WhereTo30A Stays
          </p>
          <h1 className="mt-3 max-w-2xl text-xl font-medium leading-snug text-zinc-800 sm:text-2xl">
            Find your 30A stay and book directly with trusted local rental companies.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Compare homes by town, bedrooms, and beach access — then check availability on the
            property manager&apos;s own booking site.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/list-your-rentals" className="font-medium text-teal-900 underline">
              Property managers: partner with WhereTo30A
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <StaysSearchForm
          initial={plan}
          towns={(towns ?? []) as { id: string; slug: string; title: string }[]}
        />

        {featured.length > 0 && !plan.hasFilters ? (
          <div className="mt-12">
            <h2 className="font-headline text-xl font-semibold text-zinc-900">Curated collections</h2>
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
    </main>
  );
}
