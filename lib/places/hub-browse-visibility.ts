import { townPagePath } from "@/lib/routes/town-page-path";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";

/** Whether a row should appear on a public hub listing (towns, areas, etc.). */
export function includedOnHubBrowse(value: boolean | null | undefined): boolean {
  return value !== false;
}

/** Public town detail URL when the row is browsable; otherwise null (show label only). */
export function townPublicPath(
  slug: string,
  includeOnHub: boolean | null | undefined,
): string | null {
  const normalized = normalizeUrlSegment(slug);
  if (!normalized || !includedOnHubBrowse(includeOnHub)) return null;
  return townPagePath(normalized);
}

/** Public area detail URL when the row is browsable; otherwise null (show label only). */
export function areaPublicPath(
  slug: string,
  includeInBrowse: boolean | null | undefined,
): string | null {
  const normalized = normalizeUrlSegment(slug);
  if (!normalized || !includedOnHubBrowse(includeInBrowse)) return null;
  return `/area/${normalized}`;
}

/** @deprecated Use includedOnHubBrowse */
export const townIncludedOnTownsHub = includedOnHubBrowse;

/** @deprecated Use includedOnHubBrowse */
export const areaIncludedOnAreasHub = includedOnHubBrowse;

/** PostgREST filter: NULL or true (omit only explicit false). */
export const TOWNS_HUB_INCLUDE_OR_FILTER =
  "include_on_towns_hub.is.null,include_on_towns_hub.eq.true" as const;

export const AREAS_HUB_INCLUDE_OR_FILTER =
  "include_in_site_browse.is.null,include_in_site_browse.eq.true" as const;
