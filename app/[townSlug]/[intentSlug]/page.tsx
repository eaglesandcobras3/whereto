import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getServiceSupabase,
  getServiceSupabaseOrNull,
} from "@/lib/supabase/service-role";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { metadataTitleSiteOnly, titleSegmentForLayoutTemplate } from "@/lib/seo/metadata-title";
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
    const response = cache?.response_json as
      | EnrichedRecommendationPayload
      | undefined;

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
  if (!row) return { title: metadataTitleSiteOnly };
  const ts = normalizeUrlSegment(townSlug);
  const ins = normalizeUrlSegment(intentSlug);
  return {
    ...canonicalAlternates(`/${ts}/${ins}`),
    title: titleSegmentForLayoutTemplate(row.title),
    description: row.meta_description ?? row.intro.slice(0, 160),
  };
}

export default async function SeoIntentPage({ params }: Props) {
  const { townSlug, intentSlug } = await params;
  if (isReservedRootSlug(townSlug)) notFound();

  const fullSlug = `${townSlug}/${intentSlug}`;
  const row = await loadSeoPage(fullSlug);
  if (!row?.enriched) notFound();

  const townLabel = townSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const intentLabel = intentSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-12">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
            >
              Home
            </Link>
            <svg
              className="h-4 w-4 text-[var(--color-text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <Link
              href={`/${townSlug}`}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
            >
              {townLabel}
            </Link>
            <svg
              className="h-4 w-4 text-[var(--color-text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="font-medium text-[var(--color-text-primary)]">
              {intentLabel}
            </span>
          </nav>

          <header className="space-y-4">
            <p className="text-eyebrow">{townLabel}</p>
            <h1 className="text-page-title text-[var(--color-text-primary)]">
              {row.title}
            </h1>
            {row.intro ? (
              <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
                {row.intro}
              </p>
            ) : null}
          </header>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl space-y-12 px-4 py-10">
        {/* Results */}
        <section>
          <h2 className="sr-only">Top recommendations</h2>
          <TownRecListVertical enriched={row.enriched} />
        </section>

        {/* Tips Card */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-premium-sm">
          <h2 className="text-section text-[var(--color-text-primary)]">
            Tips for {intentLabel}
          </h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>
              Use{" "}
              <Link href="/" className="text-[var(--color-primary)] hover:underline">
                AI search
              </Link>{" "}
              to refine by vibe, dietary needs, or time of day.
            </li>
            <li>
              Town guides cover broader picks — see the{" "}
              <Link
                href={`/${townSlug}`}
                className="text-[var(--color-primary)] hover:underline"
              >
                {townLabel} guide
              </Link>
              .
            </li>
            <li>Save places after signing in to build your own shortlist.</li>
          </ul>
        </section>

        {/* Related Guides */}
        {row.related.length ? (
          <section>
            <h2 className="text-section text-[var(--color-text-primary)]">
              Related guides in {townLabel}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              More curated intents for this area.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {row.related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/${r.slug}`}
                  className="
                    rounded-xl border border-[var(--color-border)]
                    bg-[var(--color-surface)] p-4
                    shadow-premium-sm
                    transition-premium hover-lift
                    hover:border-[var(--color-primary)]/30
                  "
                >
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {r.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Navigation Footer */}
        <footer className="flex flex-wrap items-center justify-center gap-6 border-t border-[var(--color-border)] pt-8">
          <Link
            href={`/${townSlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {townLabel} guide
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Ask AI
          </Link>
          <Link
            href={PRIMARY_REGION_HUB_PATH}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Region overview
          </Link>
        </footer>
      </div>
    </div>
  );
}
