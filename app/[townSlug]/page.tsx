import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getGuidesForTown, getTownBySlug, type TownGuideCard } from "@/lib/data/town-hub";
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
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";
import { generateBreadcrumbSchema, generateTownSchema } from "@/lib/seo/breadcrumb-schema";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { chicagoCalendarDaySeed, pickDailySubsetWithSalt } from "@/lib/home/daily-featured-pick";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import type { BrowseBusinessCard } from "@/lib/data/business-browse-cards";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { GuideCard } from "@/components/discovery/GuideCard";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

const PER_CATEGORY_PREVIEW = 4;

/** Town pages: fixed category order (slug keys from `business_categories`). */
const TOWN_CATEGORY_SLUG_ORDER = [
  "restaurants",
  "shopping",
  "coffee_shops",
  "activities",
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  restaurants: "restaurant",
  coffee_shops: "coffee",
  bars: "local_bar",
  activities: "kayaking",
  shopping: "shopping_bag",
  services: "home_repair_service",
  events: "event",
  beaches: "beach_access",
};

type SidebarArea = { id: string; name: string; slug: string };

type TownBusiness = BrowseBusinessCard & {
  categoryId: string | null;
  categoryTitle: string | null;
  categorySlug: string | null;
};

type TownCategorySection = {
  id: string;
  title: string;
  slug: string;
  businesses: BrowseBusinessCard[];
  totalCount: number;
};

function toTownBusiness(row: Record<string, unknown>): TownBusiness {
  const hero = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  const excerpt = (row.excerpt as string | null) ?? null;
  const cat = row.business_categories as { id?: string; title?: string; slug?: string } | null;
  return {
    id: String(row.id),
    name: String((row as { title: string }).title),
    slug: String((row as { slug: string }).slug),
    hero_image_url: hero,
    ai_one_liner: excerpt,
    ai_summary: excerpt,
    categoryId: cat?.id ?? (row.primary_category_id as string | null) ?? null,
    categoryTitle: cat?.title ?? null,
    categorySlug: cat?.slug ?? null,
  };
}

function groupBusinessesByCategory(
  businesses: TownBusiness[],
  townSlug: string,
): TownCategorySection[] {
  const allowed = new Set<string>(TOWN_CATEGORY_SLUG_ORDER);
  const map = new Map<string, { id: string; title: string; slug: string; pool: TownBusiness[] }>();

  for (const b of businesses) {
    if (!b.categorySlug || !b.categoryTitle || !b.categoryId) continue;
    if (!allowed.has(b.categorySlug)) continue;
    if (!map.has(b.categoryId)) {
      map.set(b.categoryId, {
        id: b.categoryId,
        title: b.categoryTitle,
        slug: b.categorySlug,
        pool: [],
      });
    }
    map.get(b.categoryId)!.pool.push(b);
  }

  const bySlug = new Map([...map.values()].map((cat) => [cat.slug, cat]));

  return TOWN_CATEGORY_SLUG_ORDER.flatMap((slug) => {
    const cat = bySlug.get(slug);
    if (!cat || cat.pool.length === 0) return [];
    return [
      {
        id: cat.id,
        title: cat.title,
        slug: cat.slug,
        totalCount: cat.pool.length,
        businesses: pickDailySubsetWithSalt(cat.pool, PER_CATEGORY_PREVIEW, `${townSlug}:${cat.slug}`),
      },
    ];
  });
}

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

const BIZ_SELECT =
  "id, title, slug, area_id, excerpt, primary_category_id, main_image, hero_image, main_image_url, hero_image_url, business_categories ( id, title, slug )";

const SIDEBAR_AREAS_LIMIT = 8;
const TOWN_AREAS_CANDIDATE_CAP = 50;

async function getTownPageData(townId: string, townSlug: string) {
  const supabase = getServiceSupabase();

  const [guides, areasRes] = await Promise.all([
    getGuidesForTown(townId),
    supabase
      .from("areas_view")
      .select("id, title, slug")
      .eq("town_id", townId)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(TOWN_AREAS_CANDIDATE_CAP),
  ]);

  const townAreaRows = (areasRes.data ?? []) as { id: string; title: string; slug: string }[];
  const townAreaIds = townAreaRows.map((a) => String(a.id));
  const townAreaIdSet = new Set(townAreaIds);

  const bizInTownQuery = supabase
    .from("businesses_view")
    .select(BIZ_SELECT)
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(150);

  const bizInTownAreasQuery =
    townAreaIds.length > 0
      ? supabase
          .from("businesses_view")
          .select(BIZ_SELECT)
          .in("area_id", townAreaIds)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .limit(150)
      : Promise.resolve({ data: [] as Record<string, unknown>[] | null });

  const directAreaBizTownQuery = supabase
    .from("businesses_view")
    .select("area_id")
    .eq("town_id", townId)
    .not("area_id", "is", null)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  const directAreaBizInAreasQuery =
    townAreaIds.length > 0
      ? supabase
          .from("businesses_view")
          .select("area_id")
          .in("area_id", townAreaIds)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
      : Promise.resolve({ data: [] as { area_id: string }[] | null });

  const [bizTownRes, bizAreaRes, daTownRes, daAreaRes, junctionRes] = await Promise.all([
    bizInTownQuery,
    bizInTownAreasQuery,
    directAreaBizTownQuery,
    directAreaBizInAreasQuery,
    townAreaIds.length > 0
      ? supabase.from("area_businesses").select("area_id, business_id").in("area_id", townAreaIds)
      : Promise.resolve({ data: [] as { area_id: string; business_id: string }[] | null }),
  ]);

  const businessById = new Map<string, TownBusiness>();
  for (const row of [...(bizTownRes.data ?? []), ...(bizAreaRes.data ?? [])]) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    if (!businessById.has(id)) {
      businessById.set(id, toTownBusiness(r));
    }
  }
  const hasTownBusinesses = businessById.size > 0;
  const categorySections = groupBusinessesByCategory([...businessById.values()], townSlug);

  const areaIdsWithBusiness = new Set<string>();
  for (const row of daTownRes.data ?? []) {
    const aid = (row as { area_id: string | null }).area_id;
    if (aid && townAreaIdSet.has(aid)) areaIdsWithBusiness.add(aid);
  }
  for (const row of daAreaRes.data ?? []) {
    const aid = (row as { area_id: string | null }).area_id;
    if (aid) areaIdsWithBusiness.add(aid);
  }

  const junctionRows = junctionRes.data ?? [];
  const junctionBusinessIds = [
    ...new Set(
      junctionRows.map((r) => String((r as { business_id: string }).business_id)).filter(Boolean),
    ),
  ];
  if (junctionBusinessIds.length > 0) {
    const chunkSize = 120;
    const chunks: string[][] = [];
    for (let i = 0; i < junctionBusinessIds.length; i += chunkSize) {
      chunks.push(junctionBusinessIds.slice(i, i + chunkSize));
    }
    const visResults = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("businesses_view")
          .select("id")
          .in("id", chunk)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN),
      ),
    );
    const visibleBusiness = new Set<string>();
    for (const { data: vis } of visResults) {
      for (const v of vis ?? []) visibleBusiness.add(String((v as { id: string }).id));
    }
    for (const r of junctionRows) {
      const row = r as { area_id: string; business_id: string };
      if (visibleBusiness.has(row.business_id)) areaIdsWithBusiness.add(row.area_id);
    }
  }

  const withBiz = townAreaRows.filter((a) => areaIdsWithBusiness.has(String(a.id)));
  const areaRowsForSidebar =
    withBiz.length > 0
      ? withBiz
      : hasTownBusinesses && townAreaRows.length > 0
        ? townAreaRows
        : [];

  const areas: SidebarArea[] = shuffleWithDailySeed(
    areaRowsForSidebar.map((a) => ({
      id: String(a.id),
      name: String(a.title),
      slug: String(a.slug),
    }))
  ).slice(0, SIDEBAR_AREAS_LIMIT);

  return { areas, guides, categorySections };
}

type Props = { params: Promise<{ townSlug: string }> };

export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ townSlug: string }[]> {
  try {
    const { getServiceSupabaseOrNull } = await import("@/lib/supabase/service-role");
    const supabase = getServiceSupabaseOrNull();
    if (!supabase) return [];
    const { data } = await supabase
      .from("towns")
      .select("slug")
      .is("archived_at", null)
      .order("slug");
    return (data ?? [])
      .map((r) => ({ townSlug: String((r as { slug: string }).slug) }))
      .filter((r) => r.townSlug && !isReservedRootSlug(r.townSlug));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) return { title: metadataTitleSiteOnly };
  if (isReservedRootSlug(townSlug)) return { title: metadataTitleSiteOnly };
  const town = await getTownBySlug(townSlug);
  if (town) {
    const seoTitle = (town as unknown as { seo_title?: string | null }).seo_title;
    const seoDesc = (town as unknown as { seo_description?: string | null }).seo_description;
    const title = seoTitle?.trim() || `${town.name} | Local Guide to 30A`;
    const desc =
      seoDesc?.trim() ||
      (typeof town.excerpt === "string" && town.excerpt) ||
      `Local guide: ${town.name} on 30A — restaurants, beaches, areas, and what the week actually feels like.`;
    const og = businessListingImageUrl(town.hero_image_thumb_url as string | null);
    return {
      ...canonicalAlternates(`/${town.slug}`),
      title,
      description: desc,
      openGraph: og
        ? { title: `${town.name} | WhereTo30A`, description: desc, images: [{ url: og }] }
        : { title: `${town.name} | WhereTo30A`, description: desc },
      twitter: og
        ? { card: "summary_large_image", description: desc, images: [og] }
        : { card: "summary", description: desc },
    };
  }
  return { title: metadataTitleSiteOnly };
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
    const pageData = await getTownPageData(town.id, town.slug);
    return <BasicTownPage town={town} pageData={pageData} />;
  }

  const asPlace = await getPublicPlaceBySlug(townSlug);
  if (asPlace) redirect(`/area/${townSlug}`);
  notFound();
}

type TownRecord = NonNullable<Awaited<ReturnType<typeof getTownBySlug>>>;

type TownPageData = {
  areas: SidebarArea[];
  guides: TownGuideCard[];
  categorySections: TownCategorySection[];
};

function BasicTownPage({
  town,
  pageData,
}: {
  town: TownRecord;
  pageData: TownPageData;
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

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Towns", url: "/towns" },
    { name: town.name },
  ]);

  const townSchema = generateTownSchema({
    name: town.name,
    slug: town.slug,
    description: blurb ?? descriptor,
    imageUrl: portraitUrl,
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
            dangerouslySetInnerHTML={{ __html: JSON.stringify(townSchema) }}
          />

          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              {...gaClickProps({
                event: "nav_click",
                category: "town_guide_breadcrumb",
                label: `${town.slug}_home`,
              })}
              className="text-zinc-400 transition-colors hover:text-[var(--color-primary)]"
            >
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

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
            <div className="min-w-0 space-y-12">
              {pageData.categorySections.length > 0 ? (
                <div className="space-y-12">
                  <div>
                    <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                      Local businesses in {town.name}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      Browse by category — picks rotate daily.
                    </p>
                  </div>
                  {pageData.categorySections.map((section) => {
                    const icon = section.slug
                      ? (CATEGORY_ICONS[section.slug] ?? "storefront")
                      : "storefront";
                    const searchParams = new URLSearchParams({ town_id: town.id });
                    if (section.slug) searchParams.set("category", section.slug);

                    return (
                      <section key={section.id} aria-labelledby={`town-cat-${section.id}`}>
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
                              <span className="material-symbols-outlined text-xl">{icon}</span>
                            </span>
                            <div>
                              <h3
                                id={`town-cat-${section.id}`}
                                className="font-headline text-xl font-bold text-[var(--color-text-primary)]"
                              >
                                {section.title}
                              </h3>
                              <p className="text-xs text-[var(--color-text-tertiary)]">
                                {section.totalCount}{" "}
                                {section.totalCount === 1 ? "listing" : "listings"}
                              </p>
                            </div>
                          </div>
                          {section.totalCount > PER_CATEGORY_PREVIEW ? (
                            <Link
                              href={`/search?${searchParams.toString()}`}
                              {...gaClickProps({
                                event: "nav_click",
                                category: "town_guide_category",
                                label: `${town.slug}_${section.slug}`,
                              })}
                              className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                            >
                              View all {section.totalCount}
                            </Link>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                          {section.businesses.map((b) => (
                            <BusinessPreviewCard
                              key={b.id}
                              name={b.name}
                              slug={b.slug}
                              excerpt={b.ai_summary}
                              heroImageUrl={b.hero_image_url}
                              analyticsCategory="town_guide_business"
                              analyticsLabel={`${town.slug}_${b.slug}`}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[var(--color-text-secondary)]">
                  No business listings in {town.name} yet.{" "}
                  <Link
                    href={`/search?${new URLSearchParams({ town_id: town.id }).toString()}`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Search all of 30A
                  </Link>
                </p>
              )}

              {pageData.guides.length > 0 ? (
                <section
                  className={
                    pageData.categorySections.length > 0
                      ? "border-t border-[var(--color-border)] pt-10"
                      : ""
                  }
                >
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
                        Guides for {town.name}
                      </h2>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Editorial guides linked to this town.
                      </p>
                    </div>
                    <Link
                      href="/guides"
                      {...gaClickProps({
                        event: "nav_click",
                        category: "town_guide_guides_hub",
                        label: town.slug,
                      })}
                      className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      All guides
                    </Link>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pageData.guides.map((guide) => (
                      <GuideCard
                        key={guide.id}
                        title={guide.title}
                        slug={guide.slug}
                        subtitle={guide.subtitle ?? undefined}
                        imageUrl={guide.hero_image_url}
                        analyticsCategory="town_guide_guides"
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {hasBodyMarkdown ? (
                <section className="border-t border-[var(--color-border)] pt-10">
                  <h2 className="text-eyebrow mb-6">Town guide</h2>
                  <MarkdownRenderer content={bodyMarkdown} />
                </section>
              ) : !blurb && pageData.categorySections.length === 0 ? (
                <p className="prose-editorial text-zinc-500">
                  A full local guide for this town is coming soon.
                </p>
              ) : null}
            </div>

            <aside className="space-y-6">
              {pageData.areas.length > 0 && (
                <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h2 className="text-eyebrow mb-4">Explore Areas</h2>
                  <ul className="space-y-2">
                    {pageData.areas.map((area) => (
                      <li key={area.id}>
                        <Link
                          href={`/area/${area.slug}`}
                          {...gaClickProps({
                            event: "nav_click",
                            category: "town_guide_sidebar",
                            label: `${town.slug}_area_${area.slug}`,
                          })}
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
                </section>
              )}

              {/* Featured Guides */}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
