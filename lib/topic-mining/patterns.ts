/**
 * Curated phrase → abstract category signals. Patterns match on lowercase redacted text.
 * No storage of matched substrings — only counts per candidate bucket.
 */

export type TopicPattern = {
  /** Case-insensitive regex; should not capture PII-oriented groups. */
  re: RegExp;
  normalized_category: string;
  category_type: string;
  intent_type: string | null;
  /** Base confidence contribution per hit (capped in pipeline). */
  weight: number;
};

export const TOPIC_PATTERNS: TopicPattern[] = [
  {
    re: /\b(childcare|babysitter|daycare|kids?\s*care)\b/gi,
    normalized_category: "childcare_family",
    category_type: "service",
    intent_type: "family",
    weight: 0.62,
  },
  {
    re: /\b(wedding|rehearsal\s+dinner|bridal)\b/gi,
    normalized_category: "weddings_events",
    category_type: "service",
    intent_type: "events",
    weight: 0.58,
  },
  {
    re: /\b(paddleboard|kayak|bike\s+rental|beach\s+rental)\b/gi,
    normalized_category: "outdoor_rentals",
    category_type: "activity",
    intent_type: "outdoor",
    weight: 0.6,
  },
  {
    re: /\b(dog\s*friendly|pet\s*friendly|bring\s*the\s*pup)\b/gi,
    normalized_category: "pet_friendly_dining",
    category_type: "dining",
    intent_type: "pet_friendly",
    weight: 0.55,
  },
  {
    re: /\b(brunch|breakfast\s+spot|morning\s+coffee)\b/gi,
    normalized_category: "brunch_breakfast",
    category_type: "dining",
    intent_type: "brunch",
    weight: 0.56,
  },
  {
    re: /\b(sushi|seafood\s*restaurant|oyster)\b/gi,
    normalized_category: "seafood_dining",
    category_type: "dining",
    intent_type: "seafood",
    weight: 0.54,
  },
  {
    re: /\b(live\s*music|acoustic|dj\s*night)\b/gi,
    normalized_category: "live_music_venues",
    category_type: "nightlife",
    intent_type: "live_music",
    weight: 0.53,
  },
  {
    re: /\b(yoga|pilates|massage|spa\s*day)\b/gi,
    normalized_category: "wellness_spa",
    category_type: "service",
    intent_type: "wellness",
    weight: 0.57,
  },
  {
    re: /\b(farmers?\s*market|local\s*produce|organic\s*market)\b/gi,
    normalized_category: "farmers_markets",
    category_type: "retail",
    intent_type: "local_food",
    weight: 0.52,
  },
  {
    re: /\b(shuttle|airport\s*ride|golf\s*cart\s*rental)\b/gi,
    normalized_category: "local_transport_rentals",
    category_type: "service",
    intent_type: "mobility",
    weight: 0.51,
  },
];
