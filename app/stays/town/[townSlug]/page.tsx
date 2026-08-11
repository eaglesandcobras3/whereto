import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RentalCard } from "@/components/stays/RentalCard";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { RENTAL_TOWN_HUB_MIN_PROPERTIES, STAYS_HUB_PATH } from "@/lib/stays/constants";
import { listPublishedRentalsForTownSlug } from "@/lib/stays/execute-search";
import { staysTownMetadata } from "@/lib/stays/seo";
import { getServiceSupabase, getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

/** ISR — same cadence as business listings. */
export const revalidate = 21600;
export const dynamicParams = true;

type Props = { params: Promise<{ townSlug: string }> };

export async function generateStaticParams(): Promise<{ townSlug: string }[]> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("towns")
      .select("slug")
      .eq("status", "published")
      .limit(200);
    return ((data ?? []) as { slug: string }[])
      .map((t) => t.slug?.trim())
      .filter(Boolean)
      .map((townSlug) => ({ townSlug: townSlug as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug } = await params;
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return { title: "Stays", robots: { index: false } };
  const { data: town } = await supabase
    .from("towns")
    .select("title, slug")
    .eq("slug", townSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!town) return { title: "Stays", robots: { index: false } };
  const t = town as { title: string; slug: string };
  return staysTownMetadata(t.title, t.slug);
}

export default async function StaysTownPage({ params }: Props) {
  const flags = await getAllFeatureFlags();
  if (!isRentalsFeatureEnabled(flags)) notFound();

  const { townSlug } = await params;
  const supabase = getServiceSupabase();
  const { data: town } = await supabase
    .from("towns")
    .select("id, title, slug, excerpt")
    .eq("slug", townSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!town) notFound();

  const t = town as { id: string; title: string; slug: string; excerpt: string | null };
  let items: Awaited<ReturnType<typeof listPublishedRentalsForTownSlug>> = [];
  try {
    items = await listPublishedRentalsForTownSlug(t.slug);
  } catch {
    items = [];
  }

  const indexable = items.length >= RENTAL_TOWN_HUB_MIN_PROPERTIES;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {!indexable ? (
        <meta name="robots" content="noindex,follow" />
      ) : null}
      <p className="text-sm text-zinc-500">
        <Link href={STAYS_HUB_PATH} className="hover:text-teal-900">
          Stays
        </Link>{" "}
        / {t.title}
      </p>
      <h1 className="mt-3 font-headline text-3xl font-bold tracking-tight text-zinc-900">
        Vacation rentals in {t.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
        {t.excerpt?.trim() ||
          `Browse direct-booking stays in ${t.title}. Check availability with trusted local property managers — WhereTo30A does not process reservations.`}
      </p>
      <p className="mt-3 text-sm">
        <Link href={`/town/${t.slug}`} className="font-medium text-teal-900 underline">
          Explore the {t.title} guide
        </Link>
      </p>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <RentalCard key={p.id} property={p} position={i + 1} />
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">No published stays in {t.title} yet.</p>
      ) : null}
    </main>
  );
}
