import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
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
type SidebarBusiness = { id: string; name: string; slug: string };

type SidebarData = {
  guides: SidebarGuide[];
  businesses: SidebarBusiness[];
};

async function getSidebarData(): Promise<SidebarData> {
  const supabase = getServiceSupabase();

  const [guidesRes, bizRes] = await Promise.all([
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

  return { guides, businesses };
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
  if (!place) return { title: "Area | WhereTo30A" };
  const desc = place.excerpt || `Explore ${place.title} on 30A.`;
  const og = businessListingImageUrl(place.hero_image_url);
  const pathSeg = normalizeUrlSegment(place.slug);
  return {
    ...canonicalAlternates(`/area/${pathSeg}`),
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

  const sidebar = await getSidebarData();

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
              {/* Featured Guides */}
              {sidebar.guides.length > 0 && (
                <div>
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
