/** Whether a town row should appear on the /towns hub (and home town grid). */
export function townIncludedOnTownsHub(value: boolean | null | undefined): boolean {
  return value !== false;
}

/** PostgREST filter: NULL or true (omit only explicit false). */
export const TOWNS_HUB_INCLUDE_OR_FILTER =
  "include_on_towns_hub.is.null,include_on_towns_hub.eq.true" as const;
