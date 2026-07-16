import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";

/**
 * UI-only bucket for `is_service_business` vendors with null `service_category_id`.
 * Not a DB specialty — taxonomy forbids a catch-all `other` slug.
 */
export const SERVICE_UNCATEGORIZED_SECTION_ID = "__uncategorized__" as const;
export const SERVICE_UNCATEGORIZED_PUBLIC_SEGMENT = "uncategorized" as const;
export const SERVICE_UNCATEGORIZED_TITLE = "Other providers";
export const SERVICE_UNCATEGORIZED_ICON = "more_horiz";

export function serviceUncategorizedHubPath(): string {
  return `${SERVICE_VENDORS_HUB_PATH}/${SERVICE_UNCATEGORIZED_PUBLIC_SEGMENT}`;
}

export function isServiceUncategorizedSection(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false;
  const key = slug.trim().toLowerCase();
  return (
    key === SERVICE_UNCATEGORIZED_SECTION_ID ||
    key === SERVICE_UNCATEGORIZED_PUBLIC_SEGMENT
  );
}
