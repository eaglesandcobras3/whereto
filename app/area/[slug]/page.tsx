import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPlaceBySlug, type PublicPlacePage } from "@/lib/data/public-place-by-slug";
import {
  getBrowseBusinessesForPublicPlace,
  type BrowseBusinessCard,
} from "@/lib/data/business-browse-cards";
import { BusinessBrowseLinksList } from "@/components/discovery/BusinessBrowseLinksList";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { stripLeadingH1MatchingTitle } from "@/lib/markdown/strip-duplicate-title";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { generateBreadcrumbSchema, generateAreaSchema } from "@/lib/seo/breadcrumb-schema";
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

type SidebarGuide = { slug: string; title: string };

type SidebarTownLink = { name: string; slug: string };

type AreaSidebarData = {
  townLink: SidebarTownLink | null;
  guides: SidebarGuide[];
  businesses: BrowseBusinessCard[];
  viewMoreHref: string | null;
};

const SIDEBAR_GUIDES_CAP = 6;
const SIDEBAR_BUSINESSES_CAP = 6;
const BROWSE_BUSINESSES_POOL = 36;

async function resolveTownLink(place: PublicPlacePage): Promise<SidebarTownLink | null> {
  if (place.town_slug?.trim() && place.town_name?.trim()) {
    return { name: place.town_name.trim(), slug: place.town_slug.trim() };
  }
  if (!place.town_id?.trim()) return null;
  const supabase = getServiceSupabase();
  const { data: row } = await supabase
    .from("towns")
    .select("title, slug")
    .eq("id", place.town_id.trim())
    .is("archived_at", null)
    .maybeSingle();
  if (!row) return null;
  const t = row as { title: string; slug: string };
  return { name: t.title, slug: t.slug };
}

async function getGuidesForPlace(place: PublicPlacePage): Promise<SidebarGuide[]> {
  const supabase = getServiceSupabase();
  const areaKey = place.source === "area" ? place.id : place.parent_area_id;
  const guideIds: string[] = [];

  if (areaKey) {
    const { data: ga } = await supabase
      .from("guide_areas")
      .select("guide_id")
      .eq("area_id", areaKey)
      .limit(35);
    for (const r of ga ?? []) {
      const id = (r as { guide_id: string }).guide_id;
      if (id) guideIds.push(id);
    }
  }

  if (guideIds.length === 0 && place.town_id) {
    const { data: gt } = await supabase
      .from("guide_towns")
      .select("guide_id")
      .eq("town_id", place.town_id)
      .limit(25);
    for (const r of gt ?? []) {
      const id = (r as { guide_id: string }).guide_id;
      if (id) guideIds.push(id);
    }
  }

  const unique = [...new Set(guideIds)];
  if (unique.length === 0) return [];

  const { data: gRows } = await supabase
    .from("guides_view")
    .select("slug, title")
    .in("id", unique)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(40);

  const guides = (gRows ?? []).map((g) => ({
    slug: String((g as { slug: string }).slug),
    title: String((g as { title: string }).title),
  }));
  return shuffleWithDailySeed(guides).slice(0, SIDEBAR_GUIDES_CAP);
}

function viewMoreSearchHref(place: PublicPlacePage): string | null {
  const params = new URLSearchParams();
  if (place.source === "area") {
    params.set("area_id", place.id);
  } else if (place.parent_area_id) {
    params.set("area_id", place.parent_area_id);
  } else if (place.town_id) {
    params.set("town_id", place.town_id);
    return `/search?${params.toString()}`;
  } else {
    return null;
  }
  if (place.town_id?.trim()) {
    params.set("town_id", place.town_id.trim());
  }
  return `/search?${params.toString()}`;
}

async function getAreaSidebarData(place: PublicPlacePage): Promise<AreaSidebarData> {
  const [townLink, businessCards, guides] = await Promise.all([
    resolveTownLink(place),
    getBrowseBusinessesForPublicPlace(place, BROWSE_BUSINESSES_POOL),
    getGuidesForPlace(place),
  ]);

  const businesses = shuffleWithDailySeed(businessCards).slice(0, SIDEBAR_BUSINESSES_CAP);

  return {
    townLink,
    guides,
    businesses,
    viewMoreHref: viewMoreSearchHref(place),
  };
}

type Props = { params: Promise<{ slug: string }> };

function areaTypeLabel(areaType: string | null): string {
  if (!areaType) return "Area";
  if (areaType === "point_of_interest") return "Landmark & park";
  return areaType.replace(/_/g, " ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw } = await params;
  const place = await getPublicPlaceBySlug(raw);
  if (!place) return { title: "Area" };
  const desc = place.excerpt || `Explore ${place.title} on 30A.`;
  const og = businessListingImageUrl(place.hero_image_url);
  const pathSeg = normalizeUrlSegment(place.slug);
  return {
    ...canonicalAlternates(`/area/${pathSeg}`),
    title: place.title,
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

  const sidebar = await getAreaSidebarData(area);

  const portraitUrl = businessListingImageUrl(area.hero_image_url);
  const typeLabel = areaTypeLabel(area.areaTypeLabel);
  const rawMarkdown = typeof area.content === "string" ? area.content.trim() : "";
  const bodyMarkdown = rawMarkdown
    ? stripLeadingH1MatchingTitle(rawMarkdown, area.title).trim()
    : "";
  const hasMarkdown = bodyMarkdown.length > 0;

  const browseSearchType = area.source === "point_of_interest" ? "access" : "areas";
  const browseSearchLabel = area.source === "point_of_interest" ? "Landmarks & parks" : "Areas & districts";

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    ...(area.town_slug && area.town_name
      ? [{ name: area.town_name, url: `/${area.town_slug}` }]
      : []),
    { name: area.title },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  const areaSchema = generateAreaSchema({
    name: area.title,
    slug: area.slug,
    description: area.excerpt,
    imageUrl: portraitUrl,
    townName: area.town_name,
    townSlug: area.town_slug,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12 md:px-10">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(areaSchema) }}
          />

          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              {...gaClickProps({ event: "nav_click", category: "area_breadcrumb", label: "home" })}
              className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]"
            >
              Home
            </Link>
            {area.town_slug && area.town_name && (
              <>
                <span className="text-zinc-300">/</span>
                <Link
                  href={`/${area.town_slug}`}
                  {...gaClickProps({
                    event: "nav_click",
                    category: "area_breadcrumb",
                    label: area.town_slug,
                  })}
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
                    {...gaClickProps({
                      event: "nav_click",
                      category: "area_header",
                      label: area.town_slug,
                    })}
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
              {sidebar.townLink && (
                <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h2 className="text-eyebrow mb-4">Town</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href={`/${sidebar.townLink.slug}`}
                        {...gaClickProps({
                          event: "nav_click",
                          category: "area_sidebar",
                          label: sidebar.townLink.slug,
                        })}
                        className="group flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                      >
                        <span className="material-symbols-outlined !text-base text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]">
                          place
                        </span>
                        {sidebar.townLink.name}
                      </Link>
                    </li>
                  </ul>
                </section>
              )}

              {/* Featured Guides */}
              {sidebar.guides.length > 0 && (
                <div className={sidebar.townLink ? "border-t border-[var(--color-border)] pt-6" : ""}>
                  <h3 className="text-eyebrow mb-4">Featured Guides</h3>
                  <ul className="space-y-2">
                    {sidebar.guides.map((guide) => (
                      <li key={guide.slug}>
                        <Link
                          href={`/guide/${guide.slug}`}
                          {...gaClickProps({
                            event: "nav_click",
                            category: "area_sidebar",
                            label: guide.slug,
                          })}
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
              {(sidebar.businesses.length > 0 || sidebar.viewMoreHref) && (
                <div
                  className={
                    sidebar.townLink || sidebar.guides.length > 0
                      ? "border-t border-[var(--color-border)] pt-6"
                      : ""
                  }
                >
                  {sidebar.businesses.length > 0 ? (
                    <BusinessBrowseLinksList
                      title="Featured Businesses"
                      items={sidebar.businesses}
                      analyticsCategory={`area_sidebar_businesses_${area.slug}`}
                    />
                  ) : null}
                  {sidebar.viewMoreHref ? (
                    <p className={sidebar.businesses.length > 0 ? "mt-4" : ""}>
                      <Link
                        href={sidebar.viewMoreHref}
                        {...gaClickProps({
                          event: "nav_click",
                          category: "area_sidebar",
                          label: "view_more_search",
                        })}
                        className="text-sm font-medium text-[var(--color-primary)] transition-colors hover:underline"
                        aria-label={`View more businesses in ${area.title}`}
                      >
                        View more
                      </Link>
                    </p>
                  ) : null}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
