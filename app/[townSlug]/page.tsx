import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTownBySlug } from "@/lib/data/town-hub";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import {
  PRIMARY_REGION_DB_SLUG,
  PRIMARY_REGION_HUB_PATH,
} from "@/lib/routes/primary-region";
import type { Metadata } from "next";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";

type Props = { params: Promise<{ townSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) return { title: "WhereTo30A" };
  if (isReservedRootSlug(townSlug)) return { title: "WhereTo30A" };
  const town = await getTownBySlug(townSlug);
  if (town) {
    return {
      title: `${town.name} | WhereTo30A`,
      description:
        (typeof town.excerpt === "string" && town.excerpt) ||
        `Local guide: ${town.name} on 30A.`,
    };
  }
  return { title: "WhereTo30A" };
}

/**
 * Intentionally minimal: one DB read (`getTownBySlug`) and a simple shell.
 * Add sections back when you are ready; complex parallel loads hid rendering issues.
 */
export default async function TownPage({ params }: Props) {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) notFound();
  if (isReservedRootSlug(townSlug)) notFound();

  if (townSlug === PRIMARY_REGION_DB_SLUG) {
    redirect(PRIMARY_REGION_HUB_PATH);
  }

  const town = await getTownBySlug(townSlug);
  if (town) {
    return <BasicTownPage town={town} />;
  }

  const asPlace = await getPublicPlaceBySlug(townSlug);
  if (asPlace) redirect(`/area/${townSlug}`);
  notFound();
}

type TownRecord = NonNullable<Awaited<ReturnType<typeof getTownBySlug>>>;

function BasicTownPage({ town }: { town: TownRecord }) {
  const descriptor = getTownDescriptor(town.slug);
  const blurb = town.excerpt?.trim() || null;
  const contentRaw =
    "content" in town && typeof town.content === "string" ? town.content.trim() : "";
  const bodyMarkdown = contentRaw
    ? stripLeadingH1MatchingTitle(contentRaw, town.name).trim()
    : "";
  const hasBodyMarkdown = bodyMarkdown.length > 0;
  const hero =
    ("hero_image_wide_url" in town && town.hero_image_wide_url) ||
    ("hero_image_thumb_url" in town && town.hero_image_thumb_url) ||
    null;

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-24">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        {hero && typeof hero === "string" && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-high)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={town.name} className="max-h-80 w-full object-cover" />
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Town</p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
          {town.name}
        </h1>
        <p className="mt-4 text-lg text-[var(--color-text-secondary)]">{descriptor}</p>
        {blurb && !hasBodyMarkdown ? (
          <p className="mt-6 leading-relaxed text-[var(--color-text-primary)]">{blurb}</p>
        ) : null}
        {blurb && hasBodyMarkdown ? (
          <p className="prose-editorial mt-6 text-lg leading-relaxed text-[var(--color-text-primary)]">
            {blurb}
          </p>
        ) : null}
        {hasBodyMarkdown ? (
          <div className="mt-8 max-w-3xl">
            <MarkdownRenderer content={bodyMarkdown} />
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Search
          </Link>
          <Link
            href={`/search?town_id=${encodeURIComponent(town.id)}`}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)]"
          >
            Results in {town.name}
          </Link>
          <Link
            href={`/guide/${encodeURIComponent(town.slug)}`}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)]"
          >
            Guide
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-transparent px-5 py-2.5 text-sm font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
