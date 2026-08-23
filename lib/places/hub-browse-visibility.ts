/** Whether a row should appear on a public hub listing (towns, areas, etc.). */
export function includedOnHubBrowse(value: boolean | null | undefined): boolean {
  return value !== false;
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
