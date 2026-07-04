import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPlaceBySlug, type PublicPlacePage } from "@/lib/data/public-place-by-slug";
import { getCategorySectionsForPublicPlace } from "@/lib/data/place-category-sections";
import { PlaceCategoryBusinessSections } from "@/components/discovery/PlaceCategoryBusinessSections";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { areaPageIntro } from "@/lib/seo/page-intro-copy";
import { resolvePlaceIntro } from "@/lib/seo/place-intro";
import { PlacePageHeader } from "@/components/place/PlacePageHeader";
import { TownCard } from "@/components/discovery/TownCard";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import type { Metadata } from "next";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { generateBreadcrumbSchema, generateAreaSchema } from "@/lib/seo/breadcrumb-schema";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import {
  discoveryHref,
  isDiscoveryEnabled,
  type DiscoveryFlags,
} from "@/lib/nav/discovery-links";

export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const { getServiceSupabaseOrNull } = await import("@/lib/supabase/service-role");
    const supabase = getServiceSupabaseOrNull();
    if (!supabase) return [];
    const [areas, pois] = await Promise.all([
      supabase.from("areas").select("slug").is("archived_at", null).eq("status", "published"),
      supabase.from("points_of_interest").select("slug").is("archived_at", null).eq("status", "published"),
    ]);
    const slugs = new Set<string>();
    for (const r of [...(areas.data ?? []), ...(pois.data ?? [])]) {
      const s = String((r as { slug: string }).slug);
      if (s) slugs.add(s);
    }
    return [...slugs].map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

type SidebarTownLink = { name: string; slug: string };

type AreaSidebarData = {
  townLink: SidebarTownLink | null;
};

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

function areaSectionSearchHref(
  place: PublicPlacePage,
  categorySlug: string,
): string | null {
  const params = new URLSearchParams();
  if (place.source === "area") {
    params.set("area_id", place.id);
  } else if (place.parent_area_id) {
    params.set("area_id", place.parent_area_id);
  } else if (!place.town_id) {
    return null;
  }
  if (place.town_id?.trim()) params.set("town_id", place.town_id.trim());
  params.set("category", categorySlug);
  return `/search?${params.toString()}`;
}

function areaBrowseDiscoveryHref(
  place: PublicPlacePage,
  flags: DiscoveryFlags,
): string | null {
  if (!isDiscoveryEnabled(flags)) return null;

  const townId = place.town_id?.trim() || undefined;
  if (place.source === "area") {
    return discoveryHref(flags, { area_id: place.id, town_id: townId });
  }
  if (place.parent_area_id) {
    return discoveryHref(flags, { area_id: place.parent_area_id, town_id: townId });
  }
  if (townId) {
    return discoveryHref(flags, { town_id: townId });
  }
  return null;
}

async function getAreaSidebarData(place: PublicPlacePage): Promise<AreaSidebarData> {
  const townLink = await resolveTownLink(place);
  return { townLink };
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

  if (!area) notFound();

  const [sidebar, categorySections, featureFlags] = await Promise.all([
    getAreaSidebarData(area),
    getCategorySectionsForPublicPlace(area),
    getAllFeatureFlags(),
  ]);

  const portraitUrl = businessListingImageUrl(area.hero_image_url);
  const typeLabel = areaTypeLabel(area.areaTypeLabel);
  const areaPath = `/area/${normalizeUrlSegment(area.slug)}`;
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    ...(area.town_slug && area.town_name
      ? [{ name: area.town_name, url: `/${area.town_slug}` }]
      : []),
    { name: area.title, url: areaPath },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

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

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 md:px-10 md:py-12">
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

          <PlacePageHeader
            eyebrow={typeLabel}
            title={area.title}
            intro={intro}
            portraitUrl={portraitUrl}
            portraitAlt={area.title}
            fallbackIcon="explore"
            meta={
              area.town_name && area.town_slug ? (
                <div className="mt-2 text-sm text-zinc-500 sm:mt-3">
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
              ) : undefined
            }
          />

          <div className="min-w-0 space-y-8 sm:space-y-10">
            <PlaceCategoryBusinessSections
                placeName={area.title}
                placeSlug={area.slug}
                sections={categorySections}
                analyticsCategoryPrefix="area_guide_category"
                emptyMessage={
                  areaBrowseDiscoveryHref(area, featureFlags) ? (
                    <p className="text-[var(--color-text-secondary)]">
                      No business listings in {area.title} yet.{" "}
                      <Link
                        href={areaBrowseDiscoveryHref(area, featureFlags)!}
                        className="font-medium text-[var(--color-primary)] hover:underline"
                      >
                        Search nearby
                      </Link>
                    </p>
                  ) : (
                    <p className="text-[var(--color-text-secondary)]">
                      No business listings in {area.title} yet.
                    </p>
                  )
                }
              />

              {!hasEditorialIntro && categorySections.length === 0 ? (
                <p className="prose-editorial text-zinc-500">
                  Full write-up for this place is on the way. Browse the town or nearby spots in the
                  meantime.
                </p>
              ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
