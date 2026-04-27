import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getSiteUrl } from "@/lib/site-url";
import { getBrowseBusinessesForPublicPlace } from "@/lib/data/business-browse-cards";
import { BusinessBrowseLinksList } from "@/components/discovery/BusinessBrowseLinksList";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

function areaTypeLabel(areaType: string | null): string {
  if (!areaType) return "Area";
  if (areaType === "point_of_interest") return "Landmark & park";
  return areaType.replace(/_/g, " ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPublicPlaceBySlug(slug);
  if (!place) return { title: "Area | WhereTo30A" };
  const desc = place.excerpt || `Explore ${place.title} on 30A.`;
  const og = businessListingImageUrl(place.hero_image_url);
  return {
    title: `${place.title} | WhereTo30A`,
    description: desc,
    openGraph: og
      ? { title: `${place.title} | WhereTo30A`, description: desc, images: [{ url: og }] }
      : { title: `${place.title} | WhereTo30A`, description: desc },
    twitter: og
      ? { card: "summary_large_image", description: desc, images: [og] }
      : { card: "summary", description: desc },
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = await getPublicPlaceBySlug(slug);

  if (!area) notFound();

  const placeBusinesses = await getBrowseBusinessesForPublicPlace(area, 12);
  const businessSectionTitle =
    area.source === "area" ? `Businesses in ${area.title}` : `Businesses near ${area.title}`;

  const portraitUrl = businessListingImageUrl(area.hero_image_url);
  const typeLabel = areaTypeLabel(area.areaTypeLabel);
  const rawMarkdown = typeof area.content === "string" ? area.content.trim() : "";
  const bodyMarkdown = rawMarkdown
    ? stripLeadingH1MatchingTitle(rawMarkdown, area.title).trim()
    : "";
  const hasMarkdown = bodyMarkdown.length > 0;

  const browseSearchType = area.source === "point_of_interest" ? "access" : "areas";
  const browseSearchLabel = area.source === "point_of_interest" ? "Landmarks & parks" : "Areas & districts";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: area.title,
    description: area.excerpt ?? undefined,
    url: `${getSiteUrl()}/area/${area.slug}`,
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
            {area.town_slug && area.town_name && (
              <>
                <span className="text-zinc-300">/</span>
                <Link
                  href={`/${area.town_slug}`}
                  className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]"
                >
                  {area.town_name}
                </Link>
              </>
            )}
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-500">{typeLabel}</span>
          </nav>

          <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-40 md:w-48">
              {portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portraitUrl}
                  alt={area.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  <span className="material-symbols-outlined !text-4xl" aria-hidden>
                    explore
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                {typeLabel}
              </p>
              <h1 className="text-editorial-headline mt-2 text-3xl text-zinc-900 sm:text-4xl">
                {area.title}
              </h1>
              {area.town_name && area.town_slug && (
                <div className="mt-3 text-sm text-zinc-500">
                  <Link
                    href={`/${area.town_slug}`}
                    className="inline-flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
                  >
                    <span className="material-symbols-outlined !text-base">place</span>
                    {area.town_name}
                  </Link>
                </div>
              )}
              {area.excerpt && (
                <p className="mt-4 text-lg leading-relaxed text-zinc-600">{area.excerpt}</p>
              )}
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
            <div className="min-w-0">
              {hasMarkdown ? (
                <MarkdownRenderer content={bodyMarkdown} />
              ) : !area.excerpt ? (
                <p className="prose-editorial text-zinc-500">
                  Full write-up for this place is on the way—browse the town or nearby spots in the meantime.
                </p>
              ) : null}
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h2 className="font-headline text-sm font-bold text-zinc-900">Explore</h2>
                {area.town_slug && area.town_name && (
                  <Link
                    href={`/${area.town_slug}`}
                    className="mt-3 flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
                  >
                    <span className="material-symbols-outlined !text-lg">location_city</span>
                    {area.town_name} town page
                  </Link>
                )}
                <Link
                  href={`/search?type=${browseSearchType}`}
                  className="mt-3 flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-[var(--color-primary)]"
                >
                  <span className="material-symbols-outlined !text-lg">map</span>
                  {browseSearchLabel}
                </Link>
              </div>
            </aside>
          </div>

          {placeBusinesses.length > 0 && (
            <div className="mt-10 border-t border-[var(--color-border)] pt-10">
              <BusinessBrowseLinksList title={businessSectionTitle} items={placeBusinesses} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
