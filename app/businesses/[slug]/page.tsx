import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import {
  buildCategoryHubMetadata,
  listPublishedCategorySlugs,
  loadCategory,
  loadCategoryHubPage,
  resolveCategorySlugFromPublicPath,
} from "@/lib/data/category-hub";
import { CategoryHubView } from "@/components/browse/CategoryHubView";
import {
  businessBrowseGroupFromPublicSegment,
  businessBrowseGroupPublicSegment,
} from "@/lib/business-categories/browse-group-nav";
import { BUSINESS_CATEGORY_GROUP_SLUGS } from "@/lib/business-categories/groups";
import {
  buildBrowseGroupHubMetadata,
  listLeafLinksForBrowseGroup,
  loadBrowseGroupHubPage,
} from "@/lib/data/browse-group-hub";
import { BrowseGroupHubView } from "@/components/browse/BrowseGroupHubView";
import {
  browseSectionIcon,
  listUnifiedRollupOrder,
  unifiedRollupFromPublicSegment,
  unifiedRollupPublicSegment,
} from "@/lib/categories/unified-browse";
import { listStorefrontMapMarkersForBusinessIds } from "@/lib/data/business-map-markers";
import {
  getAllFeatureFlags,
  isBusinessMapsFeatureEnabled,
  isCategoryHubSeoFeatureEnabled,
} from "@/lib/feature-flags";
import { discoverHref, isDiscoveryEnabled } from "@/lib/nav/discovery-links";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { getGuidesForCategoryHub } from "@/lib/data/town-hub";
import { partitionCategoryBusinessesByTown } from "@/lib/data/category-hub";
import { legacyBrowseGroupRedirectDestination } from "@/lib/seo/legacy-browse-group-redirects";

export const revalidate = 21600;

type Props = { params: Promise<{ slug: string }> };

async function mapMarkersForHub(
  businesses: { id: string; is_storefront: boolean }[],
  hubSlug: string,
): Promise<BusinessMapMarker[]> {
  const flags = await getAllFeatureFlags();
  if (!isBusinessMapsFeatureEnabled(flags)) return [];
  const storefrontIds = businesses.filter((b) => b.is_storefront).map((b) => b.id);
  if (storefrontIds.length === 0) return [];
  try {
    return await listStorefrontMapMarkersForBusinessIds(storefrontIds, {
      defaultIcon: browseSectionIcon(hubSlug),
    });
  } catch {
    return [];
  }
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const legacy = BUSINESS_CATEGORY_GROUP_SLUGS.map((slug) => ({
    slug: businessBrowseGroupPublicSegment(slug),
  }));
  const rollups = listUnifiedRollupOrder().map((slug) => ({
    slug: unifiedRollupPublicSegment(slug),
  }));
  const leaves = (await listPublishedCategorySlugs()).map((dbSlug) => ({
    slug: categoryHubPath(dbSlug).replace(/^\/businesses\//, ""),
  }));
  const seen = new Set<string>();
  const out: { slug: string }[] = [];
  for (const item of [...rollups, ...legacy, ...leaves]) {
    if (!item.slug || seen.has(item.slug)) continue;
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw } = await params;
  const segment = normalizeUrlSegment(raw) || raw.trim().toLowerCase();

  const rollupSlug = unifiedRollupFromPublicSegment(segment);
  if (rollupSlug) return buildBrowseGroupHubMetadata(rollupSlug);

  const groupSlug = businessBrowseGroupFromPublicSegment(segment);
  if (groupSlug) {
    const redirectTo = legacyBrowseGroupRedirectDestination(`/businesses/${segment}`);
    if (redirectTo) return { alternates: { canonical: redirectTo } };
    return buildBrowseGroupHubMetadata(groupSlug);
  }

  const categorySlug = await resolveCategorySlugFromPublicPath(segment);
  if (categorySlug) return buildCategoryHubMetadata(categorySlug);

  const slug = normalizeBusinessCategorySlug(segment) ?? segment;
  if (!slug) return { title: "Category" };
  const cat = await loadCategory(slug);
  if (!cat) return { title: "Category" };
  return buildCategoryHubMetadata(slug);
}

export default async function BusinessesCategoryOrBrowseGroupPage({ params }: Props) {
  const { slug: raw } = await params;
  const segment = normalizeUrlSegment(raw) || raw.trim().toLowerCase();
  if (!segment) notFound();

  const flags = await getAllFeatureFlags();
  const seoSubstanceEnabled = isCategoryHubSeoFeatureEnabled(flags);
  const businessesHref = isDiscoveryEnabled(flags) ? discoverHref(flags) : "/businesses";

  const rollupSlug = unifiedRollupFromPublicSegment(segment);
  if (rollupSlug) {
    const hub = await loadBrowseGroupHubPage(rollupSlug, "all");
    if (!hub) notFound();
    const [mapMarkers, leafLinks] = await Promise.all([
      mapMarkersForHub(hub.businesses, rollupSlug),
      seoSubstanceEnabled
        ? listLeafLinksForBrowseGroup(rollupSlug)
        : Promise.resolve([]),
    ]);
    return (
      <BrowseGroupHubView
        hub={hub}
        mapMarkers={mapMarkers}
        leafLinks={leafLinks}
        seoSubstanceEnabled={seoSubstanceEnabled}
        businessesHref={businessesHref}
      />
    );
  }

  const groupSlug = businessBrowseGroupFromPublicSegment(segment);
  if (groupSlug) {
    const redirectTo = legacyBrowseGroupRedirectDestination(`/businesses/${segment}`);
    if (redirectTo) permanentRedirect(redirectTo);
    const hub = await loadBrowseGroupHubPage(groupSlug, "all");
    if (!hub) notFound();
    const [mapMarkers, leafLinks] = await Promise.all([
      mapMarkersForHub(hub.businesses, groupSlug),
      seoSubstanceEnabled
        ? listLeafLinksForBrowseGroup(groupSlug)
        : Promise.resolve([]),
    ]);
    return (
      <BrowseGroupHubView
        hub={hub}
        mapMarkers={mapMarkers}
        leafLinks={leafLinks}
        seoSubstanceEnabled={seoSubstanceEnabled}
        businessesHref={businessesHref}
      />
    );
  }

  const categorySlug = await resolveCategorySlugFromPublicPath(segment);
  if (categorySlug) {
    const hub = await loadCategoryHubPage(categorySlug);
    if (!hub) notFound();
    const canonical = categoryHubPath(hub.cat.slug);
    const current = `/businesses/${segment}`;
    if (canonical !== current) permanentRedirect(canonical);
    const { townGroups } = partitionCategoryBusinessesByTown(hub.businesses);
    const townIds = townGroups
      .map((g) => g.townId)
      .filter((id): id is string => Boolean(id));
    const [mapMarkers, guides] = await Promise.all([
      mapMarkersForHub(hub.businesses, hub.cat.slug),
      seoSubstanceEnabled
        ? getGuidesForCategoryHub(townIds)
        : Promise.resolve([]),
    ]);
    return (
      <CategoryHubView
        cat={hub.cat}
        townGroups={hub.townGroups}
        businesses={hub.businesses}
        mapMarkers={mapMarkers}
        guides={guides}
        seoSubstanceEnabled={seoSubstanceEnabled}
        businessesHref={businessesHref}
      />
    );
  }

  notFound();
}
