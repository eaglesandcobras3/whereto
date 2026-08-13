import { notFound } from "next/navigation";
import { getGuidesForTown, getTownBySlug } from "@/lib/data/town-hub";
import { getTownDescriptor } from "@/lib/data/town-descriptors";
import type { Metadata } from "next";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { townPagePath } from "@/lib/routes/town-page-path";
import { PlacePageHeader } from "@/components/place/PlacePageHeader";
import { PageShareButton } from "@/components/share/PageShareButton";
import { AreaCard } from "@/components/discovery/AreaCard";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import { PlaceGuidesSection } from "@/components/place/PlaceGuidesSection";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { townPageMetadataFromAudit } from "@/lib/seo/hub-metadata";
import { metadataTitleSiteOnly } from "@/lib/seo/metadata-title";
import { getTownFactsBySlug } from "@/lib/data/town-facts-queries";
import type { TownFacts } from "@/lib/data/town-facts";
import { TownAtAGlanceSection } from "@/components/town/TownAtAGlanceSection";
import { generateTownSchema } from "@/lib/seo/breadcrumb-schema";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { chicagoCalendarDaySeed } from "@/lib/home/daily-featured-pick";
import { PlaceCategoryBusinessSections } from "@/components/discovery/PlaceCategoryBusinessSections";
import {
  BIZ_CATEGORY_SELECT,
  rowToCategoryBusiness,
} from "@/lib/data/place-category-sections";
import {
  groupBusinessesIntoBrowseSections,
  type BrowseGroupSection,
} from "@/lib/business-categories/group-browse-sections";
import { townPageIntro } from "@/lib/seo/page-intro-copy";
import { resolvePlaceIntro } from "@/lib/seo/place-intro";
import { TownFactsGate } from "@/components/feature-flags/TownFactsGate";
import { TownEmptyDiscoveryMessage } from "@/components/feature-flags/TownEmptyDiscoveryMessage";
import { CommunityTipsSection } from "@/components/community-tips/CommunityTipsSection";
import type { TownGuideCard } from "@/lib/data/town-hub";
import { IrseAdminBadge } from "@/components/irse/IrseAdminBadge";
import { BusinessMapSection } from "@/components/maps/BusinessMapSection";
import { listStorefrontMapMarkersForTown } from "@/lib/data/business-map-markers";
import { getAllFeatureFlags, isBusinessMapsFeatureEnabled, isFeedbackFeatureEnabled } from "@/lib/feature-flags";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import { ListingFieldFlagNote } from "@/components/business/ListingFieldFlagNote";

type SidebarArea = {
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  imageUrl?: string | null;
};

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

async function getTownPageData(townId: string) {
  const supabase = getServiceSupabase();

  const areasRes = await supabase
    .from("areas_view")
    .select(
      "id, title, slug, excerpt, seo_description, main_image, hero_image, main_image_url, hero_image_url",
    )
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(TOWN_AREAS_CANDIDATE_CAP);

  const townAreaRows = (areasRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    return {
      id: String(r.id),
      title: String(r.title),
      slug: String(r.slug),
      excerpt: typeof r.excerpt === "string" ? r.excerpt.trim() : "",
      seo_description:
        typeof r.seo_description === "string" ? r.seo_description.trim() : "",
      hero_image_url: heroUrl,
    };
  });
  const townAreaIds = townAreaRows.map((a) => String(a.id));
  const townAreaIdSet = new Set(townAreaIds);

  const bizInTownQuery = supabase
    .from("businesses_view")
    .select(BIZ_CATEGORY_SELECT)
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .eq("is_explorable", true)
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
          .eq("is_storefront", true)
          .eq("is_explorable", true)
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
    .eq("is_storefront", true)
    .eq("is_explorable", true)
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
  const categorySections = groupBusinessesIntoBrowseSections(
    [...businessById.values()].map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      hero_image_url: b.hero_image_url,
      ai_one_liner: b.ai_one_liner,
      ai_summary: b.ai_summary,
      categorySlug: b.categorySlug,
    })),
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
      subtitle: (() => {
        const intro = resolvePlaceIntro({
          excerpt: a.excerpt,
          seoDescription: a.seo_description,
          fallback: "",
        });
        return intro || undefined;
      })(),
      imageUrl: a.hero_image_url,
    })),
  ).slice(0, SIDEBAR_AREAS_LIMIT);

  return { areas, categorySections };
}

type Props = { params: Promise<{ slug: string }> };

/**
 * Town guides are read-heavy and change infrequently enough for multi-hour ISR.
 * This keeps repeated bot traffic on the same slug off the server function.
 */
export const revalidate = 21600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { getServiceSupabase } = await import("@/lib/supabase/service-role");
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select("slug")
    .is("archived_at", null)
    .order("slug");
  return (data ?? [])
    .map((row) => ({ slug: String((row as { slug: string }).slug) }))
    .filter((r) => r.slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = normalizeUrlSegment(raw);
  if (!slug) return { title: metadataTitleSiteOnly };
  const town = await getTownBySlug(slug);
  if (!town) return { title: metadataTitleSiteOnly };
  const seoTitle = (town as unknown as { seo_title?: string | null }).seo_title;
  const seoDesc = (town as unknown as { seo_description?: string | null }).seo_description;
  const fallbackDesc = `Local guide: ${town.name} on 30A. Restaurants, beaches, areas, and what the week actually feels like.`;
  return townPageMetadataFromAudit(
    town.name,
    town.slug,
    seoTitle,
    resolvePlaceIntro({
      excerpt: typeof town.excerpt === "string" ? town.excerpt : null,
      seoDescription: seoDesc?.trim() || null,
      fallback: "",
    }) || seoDesc?.trim() || null,
    fallbackDesc,
    businessListingImageUrl(town.hero_image_thumb_url as string | null),
  );
}

export default async function TownDetailPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = normalizeUrlSegment(raw);
  if (!slug) notFound();

  const town = await getTownBySlug(slug);
  if (!town) notFound();

  const [pageData, guides, townFacts, flags] = await Promise.all([
    getTownPageData(town.id),
    getGuidesForTown(town.id),
    getTownFactsBySlug(town.slug),
    getAllFeatureFlags(),
  ]);
  const businessMapsEnabled = isBusinessMapsFeatureEnabled(flags);
  const feedbackEnabled = isFeedbackFeatureEnabled(flags);
  let mapMarkers: BusinessMapMarker[] = [];
  if (businessMapsEnabled) {
    try {
      mapMarkers = await listStorefrontMapMarkersForTown(town.id);
    } catch {
      mapMarkers = [];
    }
  }
  return (
    <BasicTownPage
      town={town}
      pageData={pageData}
      guides={guides}
      townFacts={townFacts}
      mapMarkers={mapMarkers}
      feedbackEnabled={feedbackEnabled}
    />
  );
}

type TownRecord = NonNullable<Awaited<ReturnType<typeof getTownBySlug>>>;

type TownPageData = {
  areas: SidebarArea[];
  categorySections: BrowseGroupSection[];
};

function BasicTownPage({
  town,
  pageData,
  guides,
  townFacts,
  mapMarkers,
  feedbackEnabled,
}: {
  town: TownRecord;
  pageData: TownPageData;
  guides: TownGuideCard[];
  townFacts: TownFacts | null;
  mapMarkers: BusinessMapMarker[];
  feedbackEnabled: boolean;
}) {
  const descriptor = getTownDescriptor(town.slug);
  // Visible hero uses excerpt (at-a-glance / editorial intro). seo_description stays for metadata.
  const hasEditorialIntro = Boolean(
    resolvePlaceIntro({
      excerpt: town.excerpt,
      seoDescription: null,
      fallback: "",
    }),
  );
  const intro = resolvePlaceIntro({
    excerpt: town.excerpt,
    seoDescription: null,
    fallback: townPageIntro(town.name, descriptor),
  });
  const portraitUrl = businessListingImageUrl(town.hero_image_thumb_url as string | null);
  const townPath = townPagePath(town.slug);

  const townSchema = generateTownSchema({
    name: town.name,
    slug: town.slug,
    description: intro,
    imageUrl: portraitUrl,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <IrseAdminBadge kind="town" slug={town.slug} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 md:px-10 md:py-12">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(townSchema) }}
          />

          <HubBreadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Towns", href: "/towns" },
              { name: town.name, href: townPath, current: true },
            ]}
            analyticsCategory="town_guide_breadcrumb"
          />

          <PlacePageHeader
            eyebrow="Town"
            title={town.name}
            intro={intro}
            portraitUrl={portraitUrl}
            portraitAlt={town.name}
            fallbackIcon="location_city"
            actions={
              <PageShareButton
                pageType="town"
                pageName={town.name}
                pageSlug={town.slug}
                pageId={town.id}
                path={townPath}
              />
            }
            footer={
              feedbackEnabled ? (
                <ListingFieldFlagNote entity="town" entityId={town.id} field="header" />
              ) : null
            }
          />

          <div className="min-w-0 space-y-8 sm:space-y-10">
            {townFacts ? (
              <TownFactsGate>
                <div>
                  <TownAtAGlanceSection townName={town.name} facts={townFacts} />
                  {feedbackEnabled ? (
                    <ListingFieldFlagNote entity="town" entityId={town.id} field="facts" />
                  ) : null}
                </div>
              </TownFactsGate>
            ) : null}

            {mapMarkers.length > 0 ? (
              <BusinessMapSection
                markers={mapMarkers}
                title={`Map of ${town.name}`}
                description="Storefront businesses with a mapped location."
                fieldFlagEntityId={feedbackEnabled ? town.id : null}
                fieldFlagEntity="town"
              />
            ) : null}

            <PlaceCategoryBusinessSections
              placeName={town.name}
              placeSlug={town.slug}
              sections={pageData.categorySections}
              analyticsCategoryPrefix="town_guide_category"
              emptyMessage={
                <TownEmptyDiscoveryMessage townName={town.name} townId={town.id} />
              }
              flagEntity="town"
              flagEntityId={town.id}
            />

            <div className="space-y-3 sm:space-y-4">
              {pageData.areas.length > 0 ? (
                <PlaceRelatedSection
                  title="Explore areas"
                  description={`Neighborhoods and points of interest in ${town.name}.`}
                  layout="stack"
                >
                  {pageData.areas.map((area) => (
                    <AreaCard
                      key={area.id}
                      name={area.name}
                      slug={area.slug}
                      subtitle={area.subtitle}
                      imageUrl={area.imageUrl}
                      fullWidth
                      analyticsCategory="town_guide_related"
                    />
                  ))}
                </PlaceRelatedSection>
              ) : null}
              <ListingFieldFlagNote
                entity="town"
                entityId={town.id}
                field="areas"
                pageTitle={town.name}
                pageSlug={town.slug}
              />
            </div>

            <PlaceGuidesSection
              title={`Guides for ${town.name}`}
              description={`Local planning guides for ${town.name} and the corridor.`}
              guides={guides}
              analyticsCategory="town_guides"
              flagEntity="town"
              flagEntityId={town.id}
              placeName={town.name}
              placeSlug={town.slug}
            />

            {!hasEditorialIntro && pageData.categorySections.length === 0 ? (
              <p className="prose-editorial text-zinc-500">
                A full local guide for this town is coming soon.
              </p>
            ) : null}

            <CommunityTipsSection
              entityType="town"
              entityId={town.id}
              entityTitle={town.name}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
