export type DiscoverEntityType = "storefront" | "service";

export type BuildDiscoverUrlParams = {
  type?: DiscoverEntityType;
  townSlugs?: string[];
  category?: string;
  service_category?: string;
  tags?: string[];
  q?: string;
  page?: number;
};

/** Canonical `/discover` URL from structured filter params. */
export function buildDiscoverUrl(params: BuildDiscoverUrlParams): string {
  const sp = new URLSearchParams();
  const entityType = params.type;

  if (entityType) {
    sp.set("type", entityType === "service" ? "services" : "storefront");
  }

  const townSlugs = params.townSlugs?.filter(Boolean) ?? [];
  if (townSlugs.length) sp.set("town", townSlugs.join(","));

  if (entityType === "storefront" && params.category) sp.set("category", params.category);
  else if (!entityType && params.category) sp.set("category", params.category);

  if (entityType === "service" && params.service_category) {
    sp.set("service_category", params.service_category);
  } else if (!entityType && params.service_category) {
    sp.set("service_category", params.service_category);
  }

  const tags = params.tags?.filter(Boolean) ?? [];
  if (tags.length) sp.set("facet", tags.join(","));

  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.page && params.page > 1) sp.set("page", String(params.page));

  const qs = sp.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

export type DiscoverUrlLinkParams = {
  type?: string;
  town?: string;
  town_id?: string;
  category?: string;
  service_category?: string;
  facet?: string;
  q?: string;
  page?: number;
};

/** Build `/discover` URL from nav/link-style params (town + facet strings). */
export function buildDiscoverUrlFromLinkParams(params: DiscoverUrlLinkParams): string {
  if (params.town_id?.trim() && !params.town?.trim()) {
    const sp = new URLSearchParams();
    sp.set("town_id", params.town_id.trim());
    if (params.type === "services" || params.type === "service") sp.set("type", "services");
    else if (params.type === "storefront" || params.type === "businesses") sp.set("type", "storefront");
    if (params.category?.trim()) sp.set("category", params.category.trim());
    if (params.service_category?.trim()) sp.set("service_category", params.service_category.trim());
    if (params.facet?.trim()) sp.set("facet", params.facet.trim());
    if (params.q?.trim()) sp.set("q", params.q.trim());
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    return `/discover?${sp.toString()}`;
  }

  const townSlugs =
    params.town
      ?.split(",")
      .map((slug) => slug.trim())
      .filter(Boolean) ?? [];
  const tags =
    params.facet
      ?.split(",")
      .map((slug) => slug.trim())
      .filter(Boolean) ?? [];
  const type: DiscoverEntityType | undefined =
    params.type === "services" || params.type === "service"
      ? "service"
      : params.type === "storefront" || params.type === "businesses"
        ? "storefront"
        : parsedTypeFromCategory(params);

  return buildDiscoverUrl({
    type,
    townSlugs,
    category: params.category,
    service_category: params.service_category,
    tags,
    q: params.q,
    page: params.page,
  });
}

function parsedTypeFromCategory(params: DiscoverUrlLinkParams): DiscoverEntityType | undefined {
  if (params.service_category) return "service";
  if (params.category) return "storefront";
  return undefined;
}
