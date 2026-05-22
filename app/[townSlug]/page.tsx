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
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";
import { generateBreadcrumbSchema, generateTownSchema } from "@/lib/seo/breadcrumb-schema";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { chicagoCalendarDaySeed } from "@/lib/home/daily-featured-pick";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import type { BrowseBusinessCard } from "@/lib/data/business-browse-cards";
import { BusinessBrowseLinksList } from "@/components/discovery/BusinessBrowseLinksList";

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

function toBrowseBusinessCard(row: Record<string, unknown>): BrowseBusinessCard {
  const hero = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  const excerpt = (row.excerpt as string | null) ?? null;
  return {
    id: String(row.id),
    name: String((row as { title: string }).title),
    slug: String((row as { slug: string }).slug),
    hero_image_url: hero,
    ai_one_liner: excerpt,
    ai_summary: excerpt,
  };
}

const SIDEBAR_AREAS_LIMIT = 8;
const TOWN_AREAS_CANDIDATE_CAP = 50;

async function getSidebarData(townId: string) {
  const supabase = getServiceSupabase();

  const [guideTownLinksRes, areasRes, primaryGuidesRes] = await Promise.all([
    supabase.from("guide_towns").select("guide_id").eq("town_id", townId),
    supabase
      .from("areas_view")
      .select("id, title, slug")
      .eq("town_id", townId)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(TOWN_AREAS_CANDIDATE_CAP),
    supabase
      .from("guides_view")
      .select("id, slug, title")
      .eq("primary_town_id", townId)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(50),
  ]);

  const townAreaRows = (areasRes.data ?? []) as { id: string; title: string; slug: string }[];
  const townAreaIds = townAreaRows.map((a) => String(a.id));
  const townAreaIdSet = new Set(townAreaIds);

  const linkedGuideIds = [
    ...new Set(
      (guideTownLinksRes.data ?? [])
        .map((r) => String((r as { guide_id: string }).guide_id))
        .filter(Boolean),
    ),
  ];

  const bizInTownQuery = supabase
    .from("businesses_view")
    .select(
      "id, title, slug, area_id, excerpt, main_image, hero_image, main_image_url, hero_image_url",
    )
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(150);

  const bizInTownAreasQuery =
    townAreaIds.length > 0
      ? supabase
          .from("businesses_view")
          .select(
            "id, title, slug, area_id, excerpt, main_image, hero_image, main_image_url, hero_image_url",
          )
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

  const [bizTownRes, bizAreaRes, linkedGuidesRes, daTownRes, daAreaRes, junctionRes] = await Promise.all([
    bizInTownQuery,
    bizInTownAreasQuery,
    linkedGuideIds.length > 0
      ? supabase
          .from("guides_view")
          .select("id, slug, title")
          .in("id", linkedGuideIds)
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .limit(50)
      : Promise.resolve({ data: [] as { id: string; slug: string; title: string }[] | null }),
    directAreaBizTownQuery,
    directAreaBizInAreasQuery,
    townAreaIds.length > 0
      ? supabase.from("area_businesses").select("area_id, business_id").in("area_id", townAreaIds)
      : Promise.resolve({ data: [] as { area_id: string; business_id: string }[] | null }),
  ]);

  const businessById = new Map<string, BrowseBusinessCard>();
  for (const row of [...(bizTownRes.data ?? []), ...(bizAreaRes.data ?? [])]) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    if (!businessById.has(id)) {
      businessById.set(id, toBrowseBusinessCard(r));
    }
  }
  const hasTownBusinesses = businessById.size > 0;
  const businesses = shuffleWithDailySeed([...businessById.values()]).slice(0, 6);

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

  const guideById = new Map<string, SidebarGuide>();
  for (const row of primaryGuidesRes.data ?? []) {
    const g = row as { id: string; slug: string; title: string };
    guideById.set(g.id, { slug: g.slug, title: g.title });
  }
  for (const row of linkedGuidesRes.data ?? []) {
    const g = row as { id: string; slug: string; title: string };
    if (!guideById.has(g.id)) guideById.set(g.id, { slug: g.slug, title: g.title });
  }
  const guides: SidebarGuide[] = shuffleWithDailySeed([...guideById.values()]).slice(0, 6);

  return { areas, guides, businesses };
}

type Props = { params: Promise<{ townSlug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { townSlug: raw } = await params;
  const townSlug = normalizeUrlSegment(raw);
  if (!townSlug) return { title: metadataTitleSiteOnly };
  if (isReservedRootSlug(townSlug)) return { title: metadataTitleSiteOnly };
  const town = await getTownBySlug(townSlug);
  if (town) {
    const desc =
      (typeof town.excerpt === "string" && town.excerpt) ||
      `Local guide: ${town.name} on 30A.`;
    const og = businessListingImageUrl(town.hero_image_thumb_url as string | null);
    return {
      ...canonicalAlternates(`/${town.slug}`),
      title: town.name,
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
    const sidebar = await getSidebarData(town.id);
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
  businesses: BrowseBusinessCard[];
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
                <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h2 className="text-eyebrow mb-4">Explore Areas</h2>
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
                </section>
              )}

              {/* Featured Guides */}
              {sidebar.guides.length > 0 && (
                <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <h2 className="text-eyebrow mb-4">Featured Guides</h2>
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
                </section>
              )}

              {/* Featured Businesses */}
              {sidebar.businesses.length > 0 && (
                <div
                  className={
                    sidebar.areas.length > 0 || sidebar.guides.length > 0
                      ? "border-t border-[var(--color-border)] pt-6"
                      : ""
                  }
                >
                  <BusinessBrowseLinksList title="Featured Businesses" items={sidebar.businesses} />
                  <p className="mt-4">
                    <Link
                      href={`/search?${new URLSearchParams({ town_id: town.id }).toString()}`}
                      className="text-sm font-medium text-[var(--color-primary)] transition-colors hover:underline"
                      aria-label={`View more businesses in ${town.name}`}
                    >
                      View more
                    </Link>
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
