/**
 * User-facing copy for regional service providers (`is_service_business`).
 * DB table remains `service_categories`; URL filter uses `specialty` (not `category` or `type`).
 */

/** Query param for `service_categories.slug` on `/search` and `/services`. */
export const SERVICE_VENDOR_SPECIALTY_PARAM = "specialty";

/** @deprecated Read for backward compatibility; new links use {@link SERVICE_VENDOR_SPECIALTY_PARAM}. */
export const LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM = "service_category";

const SLUG_PATTERN = /^[a-z0-9_]+$/;

export const SERVICE_VENDOR_UI = {
  listingTypeHeading: "Looking for",
  listingStorefront: "Places & shops",
  listingProviders: "Service providers",
  specialtyHeading: "Specialty",
  specialtyMore: "more specialties",
  hubBrowseHeading: "Browse by specialty",
  hubBrowseSubheading:
    "Landscaping, plumbing, cleaning, and other trades — open a section to search providers in that specialty.",
} as const;

export function parseSpecialtySlugsFromParams(
  get: (key: string) => string | null | undefined,
): string[] {
  const raw =
    get(SERVICE_VENDOR_SPECIALTY_PARAM)?.trim() ||
    get(LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM)?.trim();
  if (!raw) return [];
  return raw.split(",").filter((s) => SLUG_PATTERN.test(s));
}

export function setSpecialtySlugsOnParams(
  params: URLSearchParams,
  slugs: string[],
): void {
  params.delete(LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM);
  if (!slugs.length) {
    params.delete(SERVICE_VENDOR_SPECIALTY_PARAM);
    return;
  }
  params.set(SERVICE_VENDOR_SPECIALTY_PARAM, slugs.join(","));
}
