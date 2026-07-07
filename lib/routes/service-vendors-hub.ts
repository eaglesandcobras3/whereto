import { buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import { setSpecialtySlugsOnParams } from "@/lib/routes/service-vendor-labels";

/** Regional / mobile service providers (`is_service_business=true`) — not the storefront category. */
export const SERVICE_VENDORS_HUB_PATH = "/services" as const;

export function serviceVendorsSearchHref(specialtySlug?: string): string {
  return buildDiscoverUrlFromLinkParams({
    type: "services",
    service_category: specialtySlug?.trim() || undefined,
  });
}

export function serviceVendorsHubHref(input?: {
  specialtySlug?: string | null;
  page?: number;
  query?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input?.specialtySlug?.trim()) {
    setSpecialtySlugsOnParams(params, [input.specialtySlug.trim()]);
  }
  if (input?.page && input.page > 1) params.set("page", String(input.page));
  if (input?.query?.trim()) params.set("q", input.query.trim());
  const qs = params.toString();
  return qs ? `${SERVICE_VENDORS_HUB_PATH}?${qs}` : SERVICE_VENDORS_HUB_PATH;
}
