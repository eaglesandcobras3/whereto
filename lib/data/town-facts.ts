/** Town “at a glance” facts stored on `public.towns` (PostHog `town_facts`). */

export const TOWN_FACTS_SELECT = [
  "at_a_glance_description",
  "walkability_rating",
  "walkability_subtext",
  "beach_type",
  "beach_type_subtext",
  "dining_rating",
  "dining_subtext",
  "getting_around_summary",
  "getting_around_subtext",
  "highlights",
  "beach_access_details",
  "getting_around_details",
  "dining_town_center_details",
  "parking_details",
].join(", ");

export type TownFactsRow = {
  at_a_glance_description: string | null;
  walkability_rating: string | null;
  walkability_subtext: string | null;
  beach_type: string | null;
  beach_type_subtext: string | null;
  dining_rating: string | null;
  dining_subtext: string | null;
  getting_around_summary: string | null;
  getting_around_subtext: string | null;
  highlights: string[] | null;
  beach_access_details: string | null;
  getting_around_details: string | null;
  dining_town_center_details: string | null;
  parking_details: string | null;
};

export type TownFactsMetric = {
  label: string;
  value: string;
  subtext: string;
  icon: string;
};

export type TownFactsDetail = {
  title: string;
  body: string;
  icon: string;
};

export type TownFacts = {
  description: string;
  metrics: TownFactsMetric[];
  highlights: string[];
  details: TownFactsDetail[];
};

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Returns a display-ready profile when required fields are present; otherwise null. */
export function parseTownFacts(row: TownFactsRow | null | undefined): TownFacts | null {
  if (!row) return null;

  const description = nonEmpty(row.at_a_glance_description);
  const walkability = nonEmpty(row.walkability_rating);
  const beachType = nonEmpty(row.beach_type);
  const dining = nonEmpty(row.dining_rating);
  const gettingAround = nonEmpty(row.getting_around_summary);
  const beachAccess = nonEmpty(row.beach_access_details);
  const gettingAroundDetails = nonEmpty(row.getting_around_details);
  const diningDetails = nonEmpty(row.dining_town_center_details);
  const parking = nonEmpty(row.parking_details);

  if (
    !description ||
    !walkability ||
    !beachType ||
    !dining ||
    !gettingAround ||
    !beachAccess ||
    !gettingAroundDetails ||
    !diningDetails ||
    !parking
  ) {
    return null;
  }

  return {
    description,
    metrics: [
      {
        label: "Walkability",
        value: walkability,
        subtext: nonEmpty(row.walkability_subtext) ?? "",
        icon: "directions_walk",
      },
      {
        label: "Beach Type",
        value: beachType,
        subtext: nonEmpty(row.beach_type_subtext) ?? "",
        icon: "lock",
      },
      {
        label: "Dining",
        value: dining,
        subtext: nonEmpty(row.dining_subtext) ?? "",
        icon: "restaurant",
      },
      {
        label: "Getting Around",
        value: gettingAround,
        subtext: nonEmpty(row.getting_around_subtext) ?? "",
        icon: "directions_bike",
      },
    ],
    highlights: normalizeHighlights(row.highlights),
    details: [
      {
        title: "Beach Access",
        body: beachAccess,
        icon: "beach_access",
      },
      {
        title: "Getting Around",
        body: gettingAroundDetails,
        icon: "directions_walk",
      },
      {
        title: "Dining & Town Center",
        body: diningDetails,
        icon: "restaurant",
      },
      {
        title: "Parking",
        body: parking,
        icon: "local_parking",
      },
    ],
  };
}

const HIGHLIGHT_ICONS: Record<string, string> = {
  "boutique shopping": "storefront",
  "fine dining": "restaurant",
  "coffee shops": "local_cafe",
  architecture: "apartment",
  "town squares": "park",
  walkable: "directions_walk",
  "bike friendly": "directions_bike",
  events: "celebration",
  "family friendly": "family_restroom",
  pools: "pool",
  quiet: "spa",
  residential: "home",
  "wide beaches": "beach_access",
  "beach access": "beach_access",
  dining: "restaurant",
  "central location": "location_on",
  casual: "nightlife",
  "local character": "palette",
  "dog friendly": "pets",
  "casual dining": "restaurant",
  privacy: "visibility_off",
  "village hub": "storefront",
  shopping: "shopping_bag",
  "live music": "music_note",
  "the hub": "hub",
  "house groups": "groups",
  space: "open_in_full",
  "west end": "west",
  "high dunes": "landscape",
  "repeat visitors": "favorite",
  "spread out": "map",
  "gulf place access": "storefront",
  "on-site options": "restaurant",
};

export function highlightIcon(label: string): string {
  return HIGHLIGHT_ICONS[label.trim().toLowerCase()] ?? "star";
}
