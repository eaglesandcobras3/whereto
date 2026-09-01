import { redirectToSectionHub } from "@/lib/routes/section-hubs";
import Link from "next/link";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
import { listAreasForAreasHub } from "@/lib/data/areas-hub-list";
import { getIntentSectionsForPublicPlace } from "@/lib/data/place-category-sections";
import { PlaceCategoryBusinessSections } from "@/components/discovery/PlaceCategoryBusinessSections";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { areaPageIntro } from "@/lib/seo/page-intro-copy";
import { resolvePlaceIntro } from "@/lib/seo/place-intro";
import { PlacePageHeader } from "@/components/place/PlacePageHeader";
import { PageShareButton } from "@/components/share/PageShareButton";
import { PlaceGuidesSection } from "@/components/place/PlaceGuidesSection";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import type { Metadata } from "next";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { generateAreaSchema } from "@/lib/seo/breadcrumb-schema";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { getAreaFactsBySlug } from "@/lib/data/area-facts-queries";
import { AreaAtAGlanceSection } from "@/components/area/AreaAtAGlanceSection";
import { AreaFactsGate } from "@/components/feature-flags/AreaFactsGate";
import { AreaEmptyDiscoveryMessage } from "@/components/feature-flags/AreaEmptyDiscoveryMessage";
import { CommunityTipsSection } from "@/components/community-tips/CommunityTipsSection";
import { getGuidesForArea } from "@/lib/data/town-hub";
import { AdminEntityEditLinks } from "@/components/admin/AdminEntityEditLinks";
import { IrseAdminBadge } from "@/components/irse/IrseAdminBadge";
import { BusinessMapSection } from "@/components/maps/BusinessMapSection";
import { listStorefrontMapMarkersForPlace } from "@/lib/data/business-map-markers";
import { getAllFeatureFlags, isBusinessMapsFeatureEnabled, isFeedbackFeatureEnabled, isTownNavFeatureEnabled } from "@/lib/feature-flags";
import { ListingFieldFlagNote } from "@/components/business/ListingFieldFlagNote";
import { PlaceIntentNavSection } from "@/components/place/PlaceIntentNavSection";
import { buildPopulatedPlaceIntentNavOptions } from "@/lib/nav/build-place-intent-nav-options";

export const revalidate = 21600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const areas = await listAreasForAreasHub();
  const slugs = new Set(areas.map((a) => a.slug));
  const { getServiceSupabase } = await import("@/lib/supabase/service-role");
  const supabase = getServiceSupabase();
  const { data: pois } = await supabase
    .from("points_of_interest")
    .select("slug")
    .is("archived_at", null)
    .eq("status", "published");
  for (const r of pois ?? []) {
    const s = String((r as { slug: string }).slug);
    if (s) slugs.add(s);
  }
  return [...slugs].map((slug) => ({ slug }));
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
  const desc = metaDescriptionSnippet(
    resolvePlaceIntro({
      excerpt: place.excerpt,
      seoDescription: place.seo_description,
      fallback: `Explore ${place.title} on 30A: beaches, dining, and local spots along the corridor.`,
    }),
    `Explore ${place.title} on 30A: beaches, dining, and local spots along the corridor.`,
  );
  const pathSeg = normalizeUrlSegment(place.slug);
  const ogTitle = `${place.title} | WhereTo30A`;
  return {
    ...canonicalAlternates(`/area/${pathSeg}`),
    title: seoTitleSegmentForLayout(place.title),
    description: desc,
    ...openGraphForPage({
      path: `/area/${pathSeg}`,
      title: ogTitle,
      description: desc,
      imageUrl: businessListingImageUrl(place.hero_image_url),
    }),
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = await getPublicPlaceBySlug(slug);

  if (!area) redirectToSectionHub("areas");

  const [intentSections, guides, flags, areaFacts, hubAreas] = await Promise.all([
    getIntentSectionsForPublicPlace(area),
    getGuidesForArea(area.id, area.town_id),
    getAllFeatureFlags(),
    area.source === "area" ? getAreaFactsBySlug(area.slug) : Promise.resolve(null),
    listAreasForAreasHub(),
  ]);
  const categorySections = intentSections.rollupSections;
  const feedbackEnabled = isFeedbackFeatureEnabled(flags);
  const townNavEnabled = isTownNavFeatureEnabled(flags);

  let mapMarkers: Awaited<ReturnType<typeof listStorefrontMapMarkersForPlace>> = [];
  if (isBusinessMapsFeatureEnabled(flags)) {
    try {
      mapMarkers = await listStorefrontMapMarkersForPlace(area);
    } catch {
      mapMarkers = [];
    }
  }

  const portraitUrl = businessListingImageUrl(area.hero_image_url);
  const typeLabel = areaTypeLabel(area.areaTypeLabel);
  const areaPath = `/area/${normalizeUrlSegment(area.slug)}`;
  const breadcrumbItems = [
    { name: "Home", href: "/" },
    { name: "Areas", href: "/areas" },
    { name: area.title, href: areaPath, current: true },
  ];

  const intro = resolvePlaceIntro({
    excerpt: area.excerpt,
    seoDescription: area.seo_description,
    fallback: areaPageIntro(area.title, typeLabel, area.town_name),
  });
  const hasEditorialIntro = Boolean(
    resolvePlaceIntro({
      excerpt: area.excerpt,
      seoDescription: area.seo_description,
      fallback: "",
    }),
  );

  const areaSchema = generateAreaSchema({
    name: area.title,
    slug: area.slug,
    description: intro,
    imageUrl: portraitUrl,
    townName: area.town_name,
    townSlug: area.town_slug,
  });
  const navOptions = buildPopulatedPlaceIntentNavOptions(
    intentSections.rollupSections,
    intentSections.leafSections,
  );
  const navPlaces = hubAreas.map((row) => ({ slug: row.slug, label: row.name }));
  const placeNav = (
    <PlaceIntentNavSection
      mode="area"
      places={navPlaces}
      categories={navOptions.categories}
      subcategories={navOptions.subcategories}
      currentPlaceSlug={area.slug}
      overlay={mapMarkers.length > 0}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <IrseAdminBadge kind="area" slug={area.slug} />
      <AdminEntityEditLinks kind="area" entityId={area.id} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 md:px-10 md:py-12">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(areaSchema) }}
          />

          {!townNavEnabled ? (
            <>
              <HubBreadcrumbs
                items={breadcrumbItems}
                analyticsCategory="area_breadcrumb"
              />

              <PlacePageHeader
                eyebrow={typeLabel}
                title={area.title}
                intro={intro}
                portraitUrl={portraitUrl}
                portraitAlt={area.title}
                fallbackIcon="explore"
                actions={
                  <PageShareButton
                    pageType="area"
                    pageName={area.title}
                    pageSlug={area.slug}
                    pageId={area.id}
                    path={areaPath}
                  />
                }
                meta={
                  area.town_name && area.town_slug ? (
                    <div className="mt-2 text-sm text-zinc-500 sm:mt-3">
                      {area.town_public_href ? (
                        <Link
                          href={area.town_public_href}
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
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined !text-base">place</span>
                          {area.town_name}
                        </span>
                      )}
                    </div>
                  ) : undefined
                }
                footer={
                  feedbackEnabled ? (
                    <ListingFieldFlagNote entity="area" entityId={area.id} field="header" />
                  ) : null
                }
              />
            </>
          ) : null}

          {mapMarkers.length === 0 ? (
            <div className={townNavEnabled ? undefined : "mt-4"}>{placeNav}</div>
          ) : null}

          <div className="min-w-0 space-y-8 sm:space-y-10">
            {areaFacts ? (
              <AreaFactsGate>
                <div>
                  <AreaAtAGlanceSection areaName={area.title} facts={areaFacts} />
                  {feedbackEnabled ? (
                    <ListingFieldFlagNote entity="area" entityId={area.id} field="facts" />
                  ) : null}
                </div>
              </AreaFactsGate>
            ) : null}

            {mapMarkers.length > 0 ? (
              <BusinessMapSection
                markers={mapMarkers}
                title={`Map of ${area.title}`}
                description="Storefront businesses with a mapped location."
                fieldFlagEntityId={feedbackEnabled ? area.id : null}
                fieldFlagEntity="area"
              >
                {placeNav}
              </BusinessMapSection>
            ) : null}

            <PlaceCategoryBusinessSections
              placeName={area.title}
              placeSlug={area.slug}
              sections={categorySections}
              analyticsCategoryPrefix="area_guide_category"
              emptyMessage={<AreaEmptyDiscoveryMessage place={area} />}
              flagEntity="area"
              flagEntityId={area.id}
            />

            <PlaceGuidesSection
              title={`Guides for ${area.title}`}
              description={
                area.town_name
                  ? `Planning guides for ${area.title} and ${area.town_name}.`
                  : `Planning guides for ${area.title}.`
              }
              guides={guides}
              analyticsCategory="area_guides"
              flagEntity="area"
              flagEntityId={area.id}
              placeName={area.title}
              placeSlug={area.slug}
            />

            {!hasEditorialIntro && categorySections.length === 0 ? (
              <p className="prose-editorial text-zinc-500">
                Full write-up for this place is on the way. Browse the town or nearby spots in the
                meantime.
              </p>
            ) : null}

            <CommunityTipsSection
              entityType="area"
              entityId={area.id}
              entityTitle={area.title}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
