import type { CommunityTipEntityType } from "@/lib/community-tips/schema";

/** Public attribution line — never exposes username or email. */
export function formatTipAttribution(city: string | null | undefined): string {
  const place = typeof city === "string" ? city.trim() : "";
  if (place) return `Someone from ${place}`;
  return "A visitor";
}

export function tipAttributionSaid(city: string | null | undefined): string {
  return `${formatTipAttribution(city)} said`;
}

export function entityPublicPath(
  entityType: CommunityTipEntityType,
  slug: string | null | undefined,
): string | null {
  const s = typeof slug === "string" ? slug.trim() : "";
  if (!s) return null;
  switch (entityType) {
    case "business":
      return `/business/${encodeURIComponent(s)}`;
    case "town":
      return `/town/${encodeURIComponent(s)}`;
    case "area":
      return `/area/${encodeURIComponent(s)}`;
    case "guide":
      return `/guide/${encodeURIComponent(s)}`;
    default:
      return null;
  }
}

export function entityTypeLabel(entityType: CommunityTipEntityType): string {
  switch (entityType) {
    case "business":
      return "Business";
    case "town":
      return "Town";
    case "area":
      return "Area";
    case "guide":
      return "Guide";
    default:
      return "Place";
  }
}
