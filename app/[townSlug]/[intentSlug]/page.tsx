import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getServiceSupabase,
  getServiceSupabaseOrNull,
} from "@/lib/supabase/service-role";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { TownRecListVertical } from "@/components/discovery/TownRecListVertical";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";

export const revalidate = 3600;

type Props = {
  params: Promise<{ townSlug: string; intentSlug: string }>;
};

export async function generateStaticParams() {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  const { data } = await supabase
    .from("seo_pages")
    .select("slug")
    .eq("published", true);
  const out: { townSlug: string; intentSlug: string }[] = [];
  for (const row of data ?? []) {
    const full = row.slug as string;
    const i = full.indexOf("/");
    if (i <= 0 || i >= full.length - 1) continue;
    const townSlug = full.slice(0, i);
    const intentSlug = full.slice(i + 1);
    if (isReservedRootSlug(townSlug)) continue;
    out.push({ townSlug, intentSlug });
  }
  return out;
}

type SeoRow = {
  title: string;
  meta_description: string | null;
  content_intro: string | null;
  recommendation_set_id: string;
  town_id: number | null;
};

async function loadSeoPage(fullSlug: string) {
  try {
    const supabase = getServiceSupabase();
    const { data: page } = await supabase
      .from("seo_pages")
      .select(
        "title, meta_description, content_intro, recommendation_set_id, town_id",
      )
      .eq("slug", fullSlug)
      .eq("published", true)
      .maybeSingle();
    if (!page) return null;
    const row = page as SeoRow;
    const { data: cache } = await supabase
      .from("query_cache")
      .select("response_json")
      .eq("id", row.recommendation_set_id)
      .maybeSingle();
    const response = cache?.response_json as EnrichedRecommendationPayload | undefined;

    let related: { slug: string; title: string }[] = [];
    if (row.town_id != null) {
      const { data: rel } = await supabase
        .from("seo_pages")
        .select("slug, title")
        .eq("town_id", row.town_id)
        .eq("published", true)
        .neq("slug", fullSlug)
        .order("title")
        .limit(10);
      related = (rel ?? []) as { slug: string; title: string }[];
    }

    return {
      title: row.title,
      meta_description: row.meta_description,
      intro: row.content_intro ?? response?.summary ?? "",
      enriched: response ?? null,
      related,
      townId: row.town_id,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug, intentSlug } = await params;
  if (isReservedRootSlug(townSlug)) return {};
  const fullSlug = `${townSlug}/${intentSlug}`;
  const row = await loadSeoPage(fullSlug);
  if (!row) return { title: "WhereTo30A" };
  return {
    title: row.title,
    description: row.meta_description ?? row.intro.slice(0, 160),
  };
}

export default async function SeoIntentPage({ params }: Props) {
  const { townSlug, intentSlug } = await params;
  if (isReservedRootSlug(townSlug)) notFound();

  const fullSlug = `${townSlug}/${intentSlug}`;
  const row = await loadSeoPage(fullSlug);
  if (!row?.enriched) notFound();

  const townLabel = townSlug.replace(/-/g, " ");

  return (
    <article className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <header className="space-y-3 border-b border-zinc-200/80 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          <Link href={`/${townSlug}`} className="hover:underline">
            {townLabel}
          </Link>
          <span className="font-normal text-zinc-400"> · </span>
          <span className="font-normal text-zinc-500">
            {intentSlug.replace(/-/g, " ")}
          </span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          {row.title}
        </h1>
        {row.intro ? (
          <p className="text-lg leading-relaxed text-zinc-600">{row.intro}</p>
        ) : null}
      </header>

      <section>
        <h2 className="sr-only">Top recommendations</h2>
        <TownRecListVertical enriched={row.enriched} />
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Tips</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-600">
          <li>
            Use{" "}
            <Link href="/" className="text-[var(--accent)] hover:underline">
              AI search
            </Link>{" "}
            to refine by vibe, dietary needs, or time of day.
          </li>
          <li>
            Town guides cover broader picks — see the{" "}
            <Link href={`/${townSlug}`} className="text-[var(--accent)] hover:underline">
              {townLabel} guide
            </Link>
            .
          </li>
          <li>Save places after signing in to build your own shortlist.</li>
        </ul>
      </section>

      {row.related.length ? (
        <section>
          <h2 className="text-base font-semibold text-zinc-900">
            Related guides
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            More curated intents in this area.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {row.related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.slug}`}
                  className="text-[var(--accent)] hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="flex flex-wrap gap-4 border-t border-zinc-200/80 pt-8 text-sm">
        <Link href={`/${townSlug}`} className="text-[var(--accent)] hover:underline">
          ← {townLabel} guide
        </Link>
        <Link href="/" className="text-[var(--accent)] hover:underline">
          Ask AI
        </Link>
        <Link href="/30a" className="text-[var(--accent)] hover:underline">
          Region overview
        </Link>
      </footer>
    </article>
  );
}
