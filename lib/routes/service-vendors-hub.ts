/** Regional / mobile service providers (`is_service_business=true`) — not the storefront category. */
export const SERVICE_VENDORS_HUB_PATH = "/services" as const;

export function serviceVendorsSearchHref(categorySlug?: string): string {
  const params = new URLSearchParams({ type: "services" });
  if (categorySlug?.trim()) params.set("category", categorySlug.trim());
  return `/search?${params.toString()}`;
}
