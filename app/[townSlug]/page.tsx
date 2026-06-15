import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getGuidesForTown, getTownBySlug, type TownGuideCard } from "@/lib/data/town-hub";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import {
  categoryDbSlugFromPublicPath,
  categoryHubPath,
} from "@/lib/routes/category-hub-path";
import { listPublishedCategorySlugs } from "@/lib/data/category-hub";
import {
  buildCategoryHubMetadata,
  loadCategoryHubPage,
} from "@/lib/data/category-hub";
import { CategoryHubView } from "@/components/browse/CategoryHubView";
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
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { generateBreadcrumbSchema, generateTownSchema } from "@/lib/seo/breadcrumb-schema";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { chicagoCalendarDaySeed } from "@/lib/home/daily-featured-pick";
import { GuideCard } from "@/components/discovery/GuideCard";
import { PlaceCategoryBusinessSections } from "@/components/discovery/PlaceCategoryBusinessSections";
import {
  BIZ_CATEGORY_SELECT,
  groupBusinessesByCategorySections,
  rowToCategoryBusiness,
  type PlaceCategorySection,
} from "@/lib/data/place-category-sections";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { placeBrowseIntro, townPageIntro } from "@/lib/seo/page-intro-copy";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { discoveryHref, isDiscoveryEnabled, type DiscoveryFlags } from "@/lib/nav/discovery-links";

type SidebarArea = { id: string; name: string; slug: string };

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
    .select(BIZ_CATEGORY_SELECT)
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(500);

  const bizInTownAreasQuery =
    townAreaIds.length > 0
      ? supabase
          .from("businesses_view")
          .select(BIZ_CATEGORY_SELECT)
          .in("area_id", townAreaIds)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .limit(500)
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

  const businessById = new Map<string, ReturnType<typeof rowToCategoryBusiness>>();
  for (const row of [...(bizTownRes.data ?? []), ...(bizAreaRes.data ?? [])]) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    if (!businessById.has(id)) {
      businessById.set(id, rowToCategoryBusiness(r));
    }
  }
  const hasTownBusinesses = businessById.size > 0;
  const categorySections = groupBusinessesByCategorySections(
    [...businessById.values()],
    townSlug,
  );

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
  const segments = new Set(
    (await listPublishedCategorySlugs()).map((slug) => categoryHubPath(slug).replace(/^\//, "")),
  );

  try {
    const { getServiceSupabaseOrNull } = await import("@/lib/supabase/service-role");
    const supabase = getServiceSupabaseOrNull();
    if (supabase) {
      const { data } = await supabase
        .from("towns")
        .select("slug")
        .is("archived_at", null)
        .order("slug");
      for (const row of data ?? []) {
        const slug = String((row as { slug: string }).slug);
        if (!slug || isReservedRootSlug(slug) || categoryDbSlugFromPublicPath(slug)) continue;
        segments.add(slug);
      }
    }
  } catch {
    // category segments only
  }

  return [...segments].map((townSlug) => ({ townSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) return { title: metadataTitleSiteOnly };
  const categorySlug = categoryDbSlugFromPublicPath(townSlug);
  if (categorySlug) return buildCategoryHubMetadata(categorySlug);
  if (isReservedRootSlug(townSlug)) return { title: metadataTitleSiteOnly };
  const town = await getTownBySlug(townSlug);
  if (town) {
    const seoTitle = (town as unknown as { seo_title?: string | null }).seo_title;
    const seoDesc = (town as unknown as { seo_description?: string | null }).seo_description;
    const title = seoTitleSegmentForLayout(
      seoTitle?.trim() || `${town.name} | Local Guide to 30A`,
    );
    const desc = metaDescriptionSnippet(
      seoDesc?.trim() ||
        (typeof town.excerpt === "string" && town.excerpt) ||
        "",
      `Local guide: ${town.name} on 30A — restaurants, beaches, areas, and what the week actually feels like.`,
    );
    const ogTitle = `${town.name} | WhereTo30A`;
    return {
      ...canonicalAlternates(`/${town.slug}`),
      title,
      description: desc,
      ...openGraphForPage({
        path: `/${town.slug}`,
        title: ogTitle,
        description: desc,
        imageUrl: businessListingImageUrl(town.hero_image_thumb_url as string | null),
      }),
    };
  }
  return { title: metadataTitleSiteOnly };
}

export default async function TownPage({ params }: Props) {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) notFound();

  const categorySlug = categoryDbSlugFromPublicPath(townSlug);
  if (categorySlug) {
    const hub = await loadCategoryHubPage(categorySlug);
    if (!hub) notFound();
    return (
      <CategoryHubView
        cat={hub.cat}
        townGroups={hub.townGroups}
        businesses={hub.businesses}
        otherCats={hub.otherCats}
      />
    );
  }

  if (isReservedRootSlug(townSlug)) notFound();

  if (townSlug === PRIMARY_REGION_DB_SLUG) {
    redirect(PRIMARY_REGION_HUB_PATH);
  }

  const town = await getTownBySlug(townSlug);
  if (town) {
    const [pageData, featureFlags] = await Promise.all([
      getTownPageData(town.id, town.slug),
      getAllFeatureFlags(),
    ]);
    return <BasicTownPage town={town} pageData={pageData} featureFlags={featureFlags} />;
  }

  const asPlace = await getPublicPlaceBySlug(townSlug);
  if (asPlace) redirect(`/area/${townSlug}`);
  notFound();
}

type TownRecord = NonNullable<Awaited<ReturnType<typeof getTownBySlug>>>;

type TownPageData = {
  areas: SidebarArea[];
  guides: TownGuideCard[];
  categorySections: PlaceCategorySection[];
};

function BasicTownPage({
  town,
  pageData,
  featureFlags,
}: {
  town: TownRecord;
  pageData: TownPageData;
  featureFlags: DiscoveryFlags;
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
    { name: town.name, url: `/${town.slug}` },
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
              <p className="prose-editorial mt-4 text-lg leading-relaxed text-zinc-600">
                {blurb || townPageIntro(town.name, descriptor)}
              </p>
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
            <div className="min-w-0 space-y-12">
              <PlaceCategoryBusinessSections
                placeName={town.name}
                placeSlug={town.slug}
                sections={pageData.categorySections}
                analyticsCategoryPrefix="town_guide_category"
                subheading={placeBrowseIntro(town.name)}
                buildSectionSearchHref={(section) => categoryHubPath(section.slug)}
                emptyMessage={
                  isDiscoveryEnabled(featureFlags) ? (
                    <p className="text-[var(--color-text-secondary)]">
                      No business listings in {town.name} yet.{" "}
                      <Link
                        href={discoveryHref(featureFlags, { town_id: town.id })}
                        className="font-medium text-[var(--color-primary)] hover:underline"
                      >
                        Search all of 30A
                      </Link>
                    </p>
                  ) : (
                    <p className="text-[var(--color-text-secondary)]">
                      No business listings in {town.name} yet.
                    </p>
                  )
                }
              />

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
                        href={
                          guide.slug === town.slug ? `/${guide.slug}` : `/guide/${guide.slug}`
                        }
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
