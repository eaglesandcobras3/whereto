/** Shared “at a glance” facts shape (towns + areas). */

export const AT_A_GLANCE_FACTS_SELECT = [
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

export type AtAGlanceFactsRow = {
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

export type AtAGlanceFactsMetric = {
  label: string;
  value: string;
  subtext: string;
  icon: string;
};

export type AtAGlanceFactsDetail = {
  title: string;
  body: string;
  icon: string;
};

export type AtAGlanceFacts = {
  description: string;
  metrics: AtAGlanceFactsMetric[];
  highlights: string[];
  details: AtAGlanceFactsDetail[];
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
export function parseAtAGlanceFacts(
  row: AtAGlanceFactsRow | null | undefined,
): AtAGlanceFacts | null {
  if (!row) return null;

  const description = nonEmpty(row.at_a_glance_description);
  const walkability = nonEmpty(row.walkability_rating);
  const beachType = nonEmpty(row.beach_type);
  const gettingAround = nonEmpty(row.getting_around_summary);
  const diningDetails = nonEmpty(row.dining_town_center_details);
  const parking = nonEmpty(row.parking_details);

  if (
    !description ||
    !walkability ||
    !beachType ||
    !gettingAround ||
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
        label: "Beach Access",
        value: beachType,
        subtext: nonEmpty(row.beach_type_subtext) ?? "",
        icon: "beach_access",
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
  "walkable shopping": "storefront",
  "dinner without driving": "restaurant",
  "evening strolls": "nightlife",
  "first-time 30a visitors": "tour",
  "family town-square energy": "family_restroom",
  "iconic photos": "photo_camera",
  "upscale dinners": "restaurant",
  "design-forward strolls": "architecture",
  "quiet evenings": "spa",
  "park-once shopping": "local_parking",
  "casual family meals": "restaurant",
  "east-end errands": "shopping_bag",
  "lunch between beach and pool": "restaurant",
  "neighborhood shopping": "storefront",
  "low-friction meals": "restaurant",
  "picky eaters": "restaurant",
  "weeknight dinners": "restaurant",
  "kids who need room to move": "family_restroom",
  "beach-day parking": "local_parking",
  "shuttle into grayton": "directions_bus",
  "morning coffee runs": "local_cafe",
  "rainy-day backup": "umbrella",
  "errands and movies": "movie",
  "destin-area convenience": "location_on",
  "one-stop shopping": "shopping_bag",
  "rainy days": "umbrella",
  "big-night-out energy": "nightlife",
};

export function highlightIcon(label: string): string {
  return HIGHLIGHT_ICONS[label.trim().toLowerCase()] ?? "star";
}
