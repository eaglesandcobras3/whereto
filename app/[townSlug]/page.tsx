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
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { chicagoCalendarDaySeed } from "@/lib/home/daily-featured-pick";

/** Deterministic shuffle using mulberry32 PRNG with daily seed */
function shuffleWithDailySeed<T>(items: T[]): T[] {
  const seed = chicagoCalendarDaySeed();
  let a = seed >>> 0;
  const rng = () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type SidebarArea = { id: string; name: string; slug: string };
type SidebarGuide = { slug: string; title: string };
type SidebarBusiness = { id: string; name: string; slug: string };

async function getSidebarData() {
  const supabase = getServiceSupabase();

  const [areasRes, guidesRes, bizRes] = await Promise.all([
    supabase
      .from("areas_view")
      .select("id, title, slug")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(50),
    supabase
      .from("guides_view")
      .select("slug, title")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(50),
    supabase
      .from("businesses_view")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("has_physical_location", true)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(100),
  ]);

  const areas: SidebarArea[] = shuffleWithDailySeed(
    (areasRes.data ?? []).map((a) => ({
      id: String((a as { id: string }).id),
      name: String((a as { title: string }).title),
      slug: String((a as { slug: string }).slug),
    }))
  ).slice(0, 8);

  const guides: SidebarGuide[] = shuffleWithDailySeed(
    (guidesRes.data ?? []).map((g) => ({
      slug: String((g as { slug: string }).slug),
      title: String((g as { title: string }).title),
    }))
  ).slice(0, 6);

  const businesses: SidebarBusiness[] = shuffleWithDailySeed(
    (bizRes.data ?? []).map((b) => ({
      id: String((b as { id: string }).id),
      name: String((b as { title: string }).title),
      slug: String((b as { slug: string }).slug),
    }))
  ).slice(0, 6);

  return { areas, guides, businesses };
}

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
      ...canonicalAlternates(`/${town.slug}`),
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
    const sidebar = await getSidebarData();
    return <BasicTownPage town={town} sidebar={sidebar} />;
  }

  const asPlace = await getPublicPlaceBySlug(townSlug);
  if (asPlace) redirect(`/area/${townSlug}`);
  notFound();
}

type TownRecord = NonNullable<Awaited<ReturnType<typeof getTownBySlug>>>;

type SidebarData = {
  areas: SidebarArea[];
  guides: SidebarGuide[];
  businesses: SidebarBusiness[];
};

function BasicTownPage({
  town,
  sidebar,
}: {
  town: TownRecord;
  sidebar: SidebarData;
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
              {/* Explore Areas */}
              {sidebar.areas.length > 0 && (
                <div>
                  <h3 className="text-eyebrow mb-4">Explore Areas</h3>
                  <ul className="space-y-2">
                    {sidebar.areas.map((area) => (
                      <li key={area.id}>
                        <Link
                          href={`/area/${area.slug}`}
                          className="group flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          <span className="material-symbols-outlined !text-base text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]">
                            explore
                          </span>
                          {area.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Featured Guides */}
              {sidebar.guides.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-6">
                  <h3 className="text-eyebrow mb-4">Featured Guides</h3>
                  <ul className="space-y-2">
                    {sidebar.guides.map((guide) => (
                      <li key={guide.slug}>
                        <Link
                          href={`/guide/${guide.slug}`}
                          className="group flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          <span className="material-symbols-outlined !text-base text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]">
                            menu_book
                          </span>
                          {guide.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Featured Businesses */}
              {sidebar.businesses.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-6">
                  <h3 className="text-eyebrow mb-4">Featured Businesses</h3>
                  <ul className="space-y-2">
                    {sidebar.businesses.map((biz) => (
                      <li key={biz.id}>
                        <Link
                          href={`/business/${biz.slug}`}
                          className="group flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          <span className="material-symbols-outlined !text-base text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]">
                            storefront
                          </span>
                          {biz.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
