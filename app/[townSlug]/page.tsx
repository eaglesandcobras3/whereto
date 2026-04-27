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
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getSiteUrl } from "@/lib/site-url";
import {
  getBrowseBusinessesForTown,
  type BrowseBusinessCard,
} from "@/lib/data/business-browse-cards";
import { BusinessBrowseLinksList } from "@/components/discovery/BusinessBrowseLinksList";

type Props = { params: Promise<{ townSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) return { title: "WhereTo30A" };
  if (isReservedRootSlug(townSlug)) return { title: "WhereTo30A" };
  const town = await getTownBySlug(townSlug);
  if (town) {
    const desc =
      (typeof town.excerpt === "string" && town.excerpt) ||
      `Local guide: ${town.name} on 30A.`;
    const og = businessListingImageUrl(town.hero_image_thumb_url as string | null);
    return {
      title: `${town.name} | WhereTo30A`,
      description: desc,
      openGraph: og
        ? { title: `${town.name} | WhereTo30A`, description: desc, images: [{ url: og }] }
        : { title: `${town.name} | WhereTo30A`, description: desc },
      twitter: og
        ? { card: "summary_large_image", description: desc, images: [og] }
        : { card: "summary", description: desc },
    };
  }
  return { title: "WhereTo30A" };
}

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
    const townBusinesses = await getBrowseBusinessesForTown(town.id, 12);
    return <BasicTownPage town={town} townBusinesses={townBusinesses} />;
  }

  const asPlace = await getPublicPlaceBySlug(townSlug);
  if (asPlace) redirect(`/area/${townSlug}`);
  notFound();
}

type TownRecord = NonNullable<Awaited<ReturnType<typeof getTownBySlug>>>;

function BasicTownPage({
  town,
  townBusinesses,
}: {
  town: TownRecord;
  townBusinesses: BrowseBusinessCard[];
}) {
  const descriptor = getTownDescriptor(town.slug);
  const blurb = town.excerpt?.trim() || null;
  const contentRaw =
    "content" in town && typeof town.content === "string" ? town.content.trim() : "";
  const bodyMarkdown = contentRaw
    ? stripLeadingH1MatchingTitle(contentRaw, town.name).trim()
    : "";
  const hasBodyMarkdown = bodyMarkdown.length > 0;

  const portraitUrl = businessListingImageUrl(town.hero_image_thumb_url as string | null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: town.name,
    description: blurb ?? descriptor,
    url: `${getSiteUrl()}/${town.slug}`,
    ...(portraitUrl ? { image: [portraitUrl] } : {}),
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12 md:px-10">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]">
              Home
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-500">{town.name}</span>
          </nav>

          <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-40 md:w-48">
              {portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portraitUrl}
                  alt={town.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  <span className="material-symbols-outlined !text-4xl" aria-hidden>
                    location_city
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                Town
              </p>
              <h1 className="text-editorial-headline mt-2 text-3xl text-zinc-900 sm:text-4xl">
                {town.name}
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-zinc-600">{descriptor}</p>
              {blurb && hasBodyMarkdown ? (
                <p className="prose-editorial mt-4 text-lg leading-relaxed text-zinc-700">
                  {blurb}
                </p>
              ) : null}
              {blurb && !hasBodyMarkdown ? (
                <p className="mt-4 text-lg leading-relaxed text-zinc-700">{blurb}</p>
              ) : null}
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
            <div className="min-w-0">
              {hasBodyMarkdown ? (
                <MarkdownRenderer content={bodyMarkdown} />
              ) : !blurb ? (
                <p className="prose-editorial text-zinc-500">
                  A full local guide for this town is coming soon—search below for businesses and
                  nearby spots.
                </p>
              ) : null}
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h2 className="font-headline text-sm font-bold text-zinc-900">Explore</h2>
                <Link
                  href="/search"
                  className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <span className="material-symbols-outlined !text-lg">search</span>
                  Search
                </Link>
                <Link
                  href={`/search?town_id=${encodeURIComponent(town.id)}`}
                  className="mt-3 flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-[var(--color-primary)]"
                >
                  <span className="material-symbols-outlined !text-lg">storefront</span>
                  Businesses in {town.name}
                </Link>
                <Link
                  href={`/search?type=towns`}
                  className="mt-3 flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-[var(--color-primary)]"
                >
                  <span className="material-symbols-outlined !text-lg">map</span>
                  All beach towns
                </Link>
                <Link
                  href={`/guide/${encodeURIComponent(town.slug)}`}
                  className="mt-3 flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-[var(--color-primary)]"
                >
                  <span className="material-symbols-outlined !text-lg">menu_book</span>
                  Town guide
                </Link>
              </div>
            </aside>
          </div>

          {townBusinesses.length > 0 && (
            <div className="mt-10 border-t border-[var(--color-border)] pt-10">
              <BusinessBrowseLinksList
                title={`Businesses in ${town.name}`}
                items={townBusinesses}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
