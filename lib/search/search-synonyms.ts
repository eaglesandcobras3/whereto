/**
 * Local-search synonym map for 30A context.
 *
 * Keys are canonical forms; values are alternate terms that should match
 * the same listings. Applied to ILIKE text search to broaden recall without
 * changing the intent-parser input.
 *
 * Keep entries lower-case. Order doesn't matter — all matches are OR'd.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  "coffee shop": ["cafe", "café", "espresso bar", "coffeehouse", "coffee house"],
  cafe: ["coffee shop", "café", "espresso", "coffeehouse"],
  café: ["coffee shop", "cafe", "espresso", "coffeehouse"],
  restaurant: ["eatery", "dining", "diner", "bistro", "brasserie"],
  bar: ["pub", "tavern", "lounge", "cocktail bar", "watering hole"],
  "ice cream": ["gelato", "sorbet", "frozen yogurt", "soft serve", "creamery"],
  gelato: ["ice cream", "sorbet", "frozen yogurt"],
  breakfast: ["brunch", "morning meal", "morning eats"],
  brunch: ["breakfast", "morning", "eggs"],
  lunch: ["midday", "afternoon eats", "sandwiches"],
  dinner: ["supper", "evening meal", "fine dining"],
  seafood: ["fish", "shrimp", "oyster", "crab", "lobster", "gulf fresh"],
  pizza: ["pizzeria", "pie", "flatbread"],
  taco: ["tacos", "mexican", "tex-mex", "burrito"],
  burger: ["hamburger", "burgers", "smash burger", "cheeseburger"],
  sushi: ["japanese", "rolls", "ramen", "hibachi"],
  bakery: ["pastry", "bread", "patisserie", "baked goods"],
  kids: ["family", "family-friendly", "children", "child-friendly", "families"],
  "family friendly": ["kids", "children", "family", "child-friendly"],
  "family-friendly": ["kids", "children", "family", "child-friendly"],
  "date night": ["romantic", "romance", "couples", "intimate"],
  romantic: ["date night", "couples", "intimate", "candles"],
  "dog friendly": ["dogs allowed", "pet friendly", "pet-friendly", "patio"],
  "pet friendly": ["dog friendly", "dogs allowed", "pets welcome"],
  "happy hour": ["cocktails", "drinks", "specials", "half price"],
  beach: ["beachside", "oceanfront", "gulf view", "waterfront", "gulf side"],
  outdoor: ["patio", "al fresco", "outside seating", "open air"],
  "live music": ["music", "band", "entertainment", "musicians"],
  shopping: ["boutique", "shop", "store", "retail"],
  boutique: ["shop", "clothing", "fashion", "accessories", "retail"],
  yoga: ["fitness", "wellness", "pilates", "mindfulness", "studio"],
  fitness: ["gym", "workout", "exercise", "yoga", "pilates"],
  spa: ["massage", "facial", "wellness", "salon", "beauty"],
  biking: ["bike", "cycling", "bicycle", "ride"],
  kayak: ["kayaking", "paddle", "paddleboard", "sup", "canoe"],
  "gluten free": ["gluten-free", "celiac", "gf options"],
  "gluten-free": ["gluten free", "celiac", "gf"],
  vegan: ["plant-based", "plant based", "vegetarian"],
  vegetarian: ["vegan", "plant-based", "meatless"],
};

/** Build a flattened synonym lookup: every term maps to its cluster members. */
const TERM_TO_CLUSTER = new Map<string, Set<string>>();
for (const [canonical, alts] of Object.entries(SYNONYM_MAP)) {
  const cluster = new Set([canonical, ...alts]);
  for (const term of cluster) {
    const key = term.toLowerCase().trim();
    if (!TERM_TO_CLUSTER.has(key)) TERM_TO_CLUSTER.set(key, new Set());
    for (const member of cluster) TERM_TO_CLUSTER.get(key)!.add(member);
  }
}

/**
 * Returns all search tokens that should be OR'd for a given query token.
 * The input token is always included. Returns an array with no duplicates.
 */
export function expandSearchToken(token: string): string[] {
  const key = token.toLowerCase().trim();
  const cluster = TERM_TO_CLUSTER.get(key);
  if (!cluster) return [token];
  return [...cluster];
}

/**
 * Given a search phrase, returns expanded tokens for ILIKE matching.
 * Phrases that have synonym clusters return additional search terms;
 * phrases with no matches return only the original.
 *
 * Only expands multi-word cluster matches when the phrase exactly matches.
 * Single-word phrases are also checked.
 */
export function expandSearchPhrase(phrase: string): string[] {
  const normalized = phrase.toLowerCase().trim();
  const cluster = TERM_TO_CLUSTER.get(normalized);
  if (cluster) return [...cluster];

  // Try individual word expansions for short phrases (≤2 words)
  const words = normalized.split(/\s+/);
  if (words.length <= 2) {
    for (const word of words) {
      const wordCluster = TERM_TO_CLUSTER.get(word);
      if (wordCluster) return [phrase, ...[...wordCluster].filter((t) => t !== word)];
    }
  }

  return [phrase];
}
