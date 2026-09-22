import type { CommunityTipEntityType } from "@/lib/community-tips/schema";

/** Public attribution line — never exposes username or email. */
export function formatTipAttribution(
  city: string | null | undefined,
  name?: string | null,
): string {
  const place = typeof city === "string" ? city.trim() : "";
  const who = typeof name === "string" ? name.trim() : "";
  if (who && place) return `${who} from ${place}`;
  if (who) return who;
  if (place) return `Someone from ${place}`;
  return "A visitor";
}

export function tipAttributionSaid(
  city: string | null | undefined,
  name?: string | null,
): string {
  return `${formatTipAttribution(city, name)} said`;
}

/** 1–2 letter placeholder — never an image. Prefers a planted first name. */
export function tipInitials(
  name?: string | null,
  city?: string | null,
): string {
  const fromName = initialsFromLabel(name);
  if (fromName) return fromName;
  const fromCity = initialsFromLabel(city);
  if (fromCity) return fromCity;
  return "V";
}

function initialsFromLabel(value: string | null | undefined): string {
  const words = (value ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w));
  if (!words.length) return "";
  const letters = words.map((w) => {
    const match = w.match(/[A-Za-z]/);
    return match ? match[0].toUpperCase() : "";
  });
  if (letters.length === 1) return letters[0];
  return `${letters[0]}${letters[1]}`;
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
