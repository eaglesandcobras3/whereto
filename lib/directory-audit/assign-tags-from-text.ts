import {
  CANONICAL_TAG_SET,
  TAG_GROUPS,
  TAG_KEYWORD_RULES,
  TAG_SYNONYMS,
  normalizeSlug,
} from "@/scripts/lib/tag-vocabulary";

const TAG_MAX = 8;
const SUGGEST_MAX = 10;
const VIBE_TAGS = new Set(TAG_GROUPS.vibe_occasion);

type TagDomain =
  | "food"
  | "retail"
  | "activity"
  | "health"
  | "home"
  | "professional"
  | "lodging";

const CATEGORY_DOMAINS: Record<string, TagDomain> = {
  Restaurants: "food",
  "Bakeries & Desserts": "food",
  "Coffee Shops": "food",
  Bars: "food",

  "Boutiques & Apparel": "retail",
  Apparel: "retail",
  "Specialty Retail": "retail",
  Jewelry: "retail",
  "Art Galleries": "retail",

  "Outdoor Activities": "activity",
  Entertainment: "activity",

  "Medical Clinics": "health",
  "Fitness Studios": "health",
  Spas: "health",
  "Hair Salons": "health",
  Dental: "health",
  "Nail Salons": "health",
  Chiropractic: "health",
  Wellness: "health",
  "Mental Health": "health",

  HVAC: "home",
  "Windows & Doors": "home",
  "Home Improvement": "home",
  "Interior Design": "home",
  Plumbing: "home",
  Cleaning: "home",
  Flooring: "home",
  Handyman: "home",
  Landscaping: "home",
  "Security Systems": "home",
  Painting: "home",
  "Pest Control": "home",
  Contractors: "home",
  Restoration: "home",
  "Home Inspection": "home",

  "Financial Services": "professional",
  "Real Estate": "professional",
  "Business Services": "professional",
  Legal: "professional",
  Insurance: "professional",
  "Vacation Rental Management": "professional",
  Coworking: "professional",
  Photography: "professional",
  Architecture: "professional",
  "Web Development": "professional",

  "Hotels & Resorts": "lodging",
};

const DOMAIN_TAGS: Record<TagDomain, Set<string>> = {
  food: new Set([...TAG_GROUPS.food_drink, ...TAG_GROUPS.dietary_meal_period]),
  retail: new Set(TAG_GROUPS.retail),
  activity: new Set([...TAG_GROUPS.activity_rental, "activities"]),
  health: new Set(TAG_GROUPS.health_beauty),
  home: new Set(TAG_GROUPS.home_trades_professional),
  professional: new Set(TAG_GROUPS.home_trades_professional),
  lodging: new Set(["travel_services"]),
};

const CATEGORY_TAGS: Record<string, Set<string>> = {
  "Medical Clinics": new Set([
    "medical_care",
    "healthcare",
    "hospice_rehab_care",
    "veterinary_care",
    "counseling",
    "dermatology",
    "dental_care",
    "skincare",
  ]),
  "Fitness Studios": new Set(["fitness_classes", "yoga", "wellness"]),
  Spas: new Set(["spa_services", "massage", "skincare", "wellness"]),
  "Hair Salons": new Set(["salon_services", "beauty_products"]),
  Dental: new Set(["dental_care"]),
  "Nail Salons": new Set(["nail_services", "spa_services"]),
  Chiropractic: new Set(["chiropractic_care"]),
  Wellness: new Set(["wellness", "yoga", "fitness_classes", "spa_services", "massage"]),
  "Mental Health": new Set(["counseling"]),

  HVAC: new Set(["hvac_repair"]),
  "Windows & Doors": new Set(["window_treatments"]),
  "Home Improvement": new Set(["home_improvement", "cabinetry", "flooring", "painting", "window_treatments"]),
  "Interior Design": new Set(["home_improvement", "cabinetry", "home_decor", "window_treatments"]),
  Plumbing: new Set(["plumbing"]),
  Cleaning: new Set(["cleaning_services"]),
  Flooring: new Set(["flooring"]),
  Handyman: new Set(["handyman", "home_improvement", "painting"]),
  Landscaping: new Set(["landscaping", "lawn_care"]),
  "Security Systems": new Set(["security_systems"]),
  Painting: new Set(["painting"]),
  "Pest Control": new Set(["pest_control"]),
  Contractors: new Set(["contractors", "home_improvement"]),
  Restoration: new Set(["restoration"]),
  "Home Inspection": new Set(["home_inspection"]),

  "Financial Services": new Set(["financial_planning", "banking", "accounting", "tax_prep", "bookkeeping"]),
  "Real Estate": new Set(["real_estate"]),
  Legal: new Set(["legal_services"]),
  Insurance: new Set(["insurance"]),
  "Vacation Rental Management": new Set(["property_management"]),
  Coworking: new Set(["coworking"]),
  Photography: new Set(["photography"]),
  Architecture: new Set(["contractors", "home_improvement"]),
  "Web Development": new Set(),
};

/**
 * A listing's category is the primary intent signal. Copy may mention products,
 * nearby businesses, or activities without the listing actually offering them.
 */
function isEligibleTag(tag: string, category: string | undefined): boolean {
  const normalizedCategory = category?.trim() ?? "";
  const categoryTags = CATEGORY_TAGS[normalizedCategory];
  if (categoryTags) return VIBE_TAGS.has(tag) || categoryTags.has(tag);

  const domain = CATEGORY_DOMAINS[normalizedCategory];
  return !domain || VIBE_TAGS.has(tag) || DOMAIN_TAGS[domain].has(tag);
}

/** Map freeform suggestions onto the canonical vocabulary (exact + synonyms). */
export function matchSuggestedTagsToVocab(suggestions: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of suggestions) {
    if (out.length >= TAG_MAX) break;
    const slug = normalizeSlug(raw);
    if (!slug) continue;
    const mapped = TAG_SYNONYMS[slug] ?? slug;
    if (!CANONICAL_TAG_SET.has(mapped) || seen.has(mapped)) continue;
    seen.add(mapped);
    out.push(mapped);
  }
  return out;
}

export function parseSuggestedTagList(raw: string | undefined): string[] {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\s*\|\s*|\s*,\s*/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, SUGGEST_MAX);
}

/**
 * Prefer Gemini freeform suggestions matched to vocab, then fill gaps with
 * keyword rules + category/title tokens against listing text.
 */
export function assignTagsFromListingText(parts: {
  title?: string;
  category?: string;
  excerpt?: string;
  overview?: string;
  search_keywords?: string;
  suggested_tags?: string[] | string;
}): string[] {
  const suggestions = Array.isArray(parts.suggested_tags)
    ? parts.suggested_tags
    : parseSuggestedTagList(parts.suggested_tags);

  const out: string[] = [];
  const seen = new Set<string>();

  function add(tag: string) {
    if (out.length >= TAG_MAX) return;
    if (!CANONICAL_TAG_SET.has(tag) || seen.has(tag) || !isEligibleTag(tag, parts.category)) return;
    seen.add(tag);
    out.push(tag);
  }

  for (const tag of matchSuggestedTagsToVocab(suggestions)) add(tag);

  const text = [
    parts.title,
    parts.category,
    parts.excerpt,
    parts.overview,
    parts.search_keywords,
    suggestions.join(" "),
  ]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n");

  if (text) {
    for (const { pattern, tag } of TAG_KEYWORD_RULES) {
      if (out.length >= TAG_MAX) break;
      if (pattern.test(text)) add(tag);
    }

    const soft = `${parts.category ?? ""} ${parts.title ?? ""}`;
    for (const raw of soft.split(/[^a-zA-Z0-9]+/)) {
      if (out.length >= TAG_MAX) break;
      const slug = normalizeSlug(raw);
      if (slug.length < 3) continue;
      add(slug);
    }
  }

  return out.slice(0, TAG_MAX);
}

export function formatAuditTags(tags: string[]): string {
  return tags.join(" | ");
}
