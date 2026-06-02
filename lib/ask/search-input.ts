/** Shared Ask search input normalization (no server-only). */

const CANONICAL_VIBE_TAGS = new Set([
  "romantic",
  "kid_friendly",
  "group_friendly",
  "date_night",
  "solo_friendly",
  "waterfront",
  "beachfront",
  "outdoor_seating",
  "scenic_views",
  "upscale",
  "casual",
  "local_favorite",
  "hidden_gem",
  "instagrammable",
  "breakfast",
  "brunch",
  "quick_bite",
  "late_night",
  "happy_hour",
  "live_music",
  "pet_friendly",
  "parking",
  "walkable",
  "free_entry",
]);

const VIBE_TAG_ALIASES: Record<string, string> = {
  kids: "kid_friendly",
  kid: "kid_friendly",
  children: "kid_friendly",
  child: "kid_friendly",
  family: "family_friendly",
  families: "family_friendly",
  dog: "pet_friendly",
  dogs: "pet_friendly",
};

const CORRIDOR_LOCATION =
  /^(30a|30-a|the\s+30a|emerald\s+coast|florida|fl|northwest\s+florida|south\s+walton|walton\s+county)$/i;

/** Town names on 30A — shared with clarify flow; bare "beach" is not matched. */
export const TOWN_IN_QUERY_REGEX =
  /\b(seaside|rosemary\s*beach|alys\s*beach|watercolor|water\s*color|watersound|water\s*sound|seagrove|grayton|santa\s*rosa|inlet\s*beach|blue\s*mountain|dune\s*allen|gulf\s*place|prominence)\b/i;

export function extractTownFromText(text: string): string | undefined {
  const m = text.match(TOWN_IN_QUERY_REGEX);
  if (!m) return undefined;
  return m[0].replace(/\s+/g, " ").trim();
}

export function userMentionedBudget(message: string): boolean {
  return /\b(cheap|budget|inexpensive|affordable|under\s+\$|price[- ]?conscious)\b/i.test(
    message,
  );
}

export function isCorridorPlaceholder(town?: string): boolean {
  if (!town?.trim()) return true;
  const n = town.trim().toLowerCase();
  if (CORRIDOR_LOCATION.test(n)) return true;
  if (
    /\b30a\b/.test(n) &&
    !/\b(beach|rosemary|seaside|grayton|inlet|watercolor|alys|gulf|blue\s+mountain)\b/i.test(n)
  ) {
    return true;
  }
  return false;
}

export function buildAskSearchQuery(toolQuery: string, userMessage?: string): string {
  const tq = toolQuery.trim();
  const um = userMessage?.trim() ?? "";
  if (!um) return tq;
  if (!tq) return um;

  const tqWords = tq.split(/\s+/).length;
  if (tq.length < 24 || tqWords <= 3) {
    if (um.toLowerCase().includes(tq.toLowerCase())) return um;
    return um;
  }
  return tq;
}

export function normalizeAskVibeTags(
  tags?: string[],
  atmosphere?: string[],
  occasion?: string[],
): string[] | undefined {
  const merged = [...(tags ?? []), ...(atmosphere ?? []), ...(occasion ?? [])];
  if (!merged.length) return undefined;

  const out = new Set<string>();
  for (const raw of merged) {
    const key = raw.toLowerCase().trim().replace(/\s+/g, "_");
    if (CANONICAL_VIBE_TAGS.has(key)) out.add(key);
    else if (VIBE_TAG_ALIASES[key]) out.add(VIBE_TAG_ALIASES[key]);
  }
  return out.size ? [...out] : undefined;
}

export function enrichQueryForContext(query: string): string {
  let q = query.trim();
  const lower = q.toLowerCase();
  if (/\b(kid|kids|child|children|family)\b/.test(lower)) {
    if (!/\b(treat|bakery|pastry|sweet|cookie|donut|ice\s*cream)\b/.test(lower)) {
      q = `${q} bakery pastries treats`.trim();
    }
  }
  return q;
}

export type AskQueryThemes = {
  coffee: boolean;
  treats: boolean;
  bakery: boolean;
  iceCream: boolean;
  donuts: boolean;
  kids: boolean;
  dining: boolean;
  shopping: boolean;
  activities: boolean;
  bars: boolean;
};

/** User's treat-type chip / clarify answer — narrows which discovery strategies run. */
export type TreatPreference = "bakery" | "ice_cream" | "donut" | "coffee_sweet";

/**
 * Parse treat intent from the full user message (including clarification chips).
 * Returns null when treat type is still ambiguous.
 */
export function detectTreatPreference(text: string): TreatPreference | null {
  const q = text.toLowerCase();
  if (/\b(ice\s*cream|gelato|frozen\s+yogurt|fro\s*yo|shaved\s+ice)\b/.test(q)) {
    return "ice_cream";
  }
  if (/\b(donut|doughnut)\b/.test(q) && !/\bbakery\s*item\b/.test(q)) {
    return "donut";
  }
  if (/\b(bakery\s*item|bakery|pastry|pastries|muffin|croissant)\b/.test(q)) {
    return "bakery";
  }
  if (/\bcold\s*brew\b/.test(q) && /\bsweet\b/.test(q)) {
    return "coffee_sweet";
  }
  return null;
}

export function detectQueryThemes(query: string): AskQueryThemes {
  const q = query.toLowerCase();
  return {
    coffee: /\b(coffee|cafe|café|espresso|latte)\b/.test(q),
    treats: /\b(treat|treats|sweet|sweets|dessert|snack)\b/.test(q),
    bakery: /\b(bakery|pastry|pastries|muffin|croissant|bread|baked)\b/.test(q),
    iceCream: /\b(ice\s*cream|gelato|frozen\s+yogurt|fro\s*yo|shaved\s+ice)\b/.test(q),
    donuts: /\b(donut|doughnut)\b/.test(q),
    kids: /\b(kid|kids|child|children|family|toddler)\b/.test(q),
    dining: /\b(eat|food|meal|restaurant|lunch|dinner|breakfast|brunch|hungry)\b/.test(q),
    shopping: /\b(shop|shopping|boutique|retail|store)\b/.test(q),
    // Do not match bare "beach" — town names like Rosemary Beach false-trigger activities.
    activities: /\b(activity|activities|things?\s+to\s+do|kayak|bike|golf)\b/.test(q),
    bars: /\b(bar|pub|cocktail|wine|brewery|happy\s+hour)\b/.test(q),
  };
}
