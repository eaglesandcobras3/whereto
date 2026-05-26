import OpenAI from "openai";
import { searchIntentSchema, type SearchIntent } from "@/lib/intent-schema";
import type { BusinessRowWithTags } from "@/lib/scoring";

const PARSE_SYSTEM = `You are a query parser for WhereTo30A, a local business discovery app for Florida's 30A corridor.
Parse the user's natural language query into a structured search intent. Output JSON only.

Towns (slugs, east→west): carillon-beach, inlet-beach, rosemary-beach, seacrest-beach, alys-beach, watersound, seagrove-beach, seaside, watercolor, grayton-beach, blue-mountain-beach, santa-rosa-beach, gulf-place, dune-allen-beach, sandestin

Categories (slugs): restaurants, coffee_shops, bars, activities, shopping, services

Schema fields to populate:
- category: category slug or null
- subcategory: more specific type or null
- location: { town: slug or null, radius: "exact"|"near"|"anywhere" }
- attributes[]: vibe tag slugs (kid_friendly, pet_friendly, outdoor_seating, romantic, casual, upscale, waterfront, live_music, date_night, groups, family, sunset_views)
- exclude_attributes[]: tags to exclude
- sort_preference: "quality"|"distance"|"price" (default "quality")
- price_level: 1-4 or null (1=$ 2=$$ 3=$$$ 4=$$$$)
- result_count: 1-12 (default 10)
- specific_items[]: concrete things the user wants to find (dishes, drinks, retail products, gear to rent). Empty if none.
  CRITICAL — do NOT put vague quality or demographic words in specific_items. These map elsewhere:
    "kid food", "food for kids", "family food", "children's meals" → attributes: ["kid_friendly"], specific_items: []
    "healthy food", "light food" → atmosphere_needs or dietary_needs, specific_items: []
    "good food", "great food", "best food" → specific_items: [] (covered by quality scoring)
  specific_items is ONLY for concrete, menu-level items: "fish tacos", "hamburger", "espresso", "paddleboard rental", "books".
  For FOOD or DRINK: expand close variants yourself so retrieval matches how listings are written—e.g. user says "hamburger", "burger", or "cheeseburger" → include multiple short stems like "hamburger", "burger", "cheeseburger" as needed (do not rely on downstream code to guess synonyms).
  Similarly: "ice cream" → add stems like "ice cream", "gelato", "frozen yogurt" when relevant; "donut" / "doughnuts" → include both spellings; bookstore / books / reading → include "books", "bookstore", "reading" plus the user's exact wording.
  For retail (books, sunscreen, etc.) include the product words the user used plus obvious synonyms.
  For gear/activities (paddleboards, bike rental) use activity-appropriate wording; do not tag as food.
- dietary_needs[]: dietary restrictions mentioned ("gluten_free", "vegan", "vegetarian", "dairy_free"). Empty if none.
- meal_period: "breakfast"|"brunch"|"lunch"|"dinner"|"late_night" or null
- atmosphere_needs[]: atmosphere words mentioned ("romantic", "waterfront", "outdoor_seating", "quiet", "lively", "cozy", "upscale"). Empty if none.
- occasion: specific occasion or null ("date_night", "family_outing", "rainy_day", "girls_trip", "celebration", "solo")
- query_type: REQUIRED — "keyword" (simple type query like "bookstores"), "specific" (named dish/product/gear or strong item focus like "places with fish tacos"), "vibe" (atmosphere/occasion like "romantic waterfront dinner")

Category rules (important):
- Any sit-down or counter-service meal, dish, handheld, or "places to eat" intent → category "restaurants" unless the user is clearly only seeking coffee/tea/bakery without a meal → "coffee_shops", or clearly bar-first → "bars".
- Do NOT leave category null when the user is looking for a type of business to visit (food, drink, shop, service, activity). Pick the best slug.
- If specific_items contains food or drink meant to be consumed at a venue, category should almost always be "restaurants", "coffee_shops", or "bars"—not "shopping" or "services".
- Bookstores and book shopping ("books near X", "bookstore") → category "shopping" with specific_items for books/bookstore; not "restaurants".
- Food truck / food stand / taco truck / street food → category "restaurants", subcategory "food_truck".
- subcategory examples: "food_truck", "pizza", "tacos", "seafood", "breakfast", "brunch", "burgers", "mediterranean", "bbq", "italian". Use a short noun phrase that describes the subtype. Leave null for generic queries like "restaurants near seaside".

location.radius rules:
- "exact" — user said "in <town>" or named town without a proximity word
- "near" — user said "near", "nearby", "around", "close to", or "by" a town
- "anywhere" — no town mentioned`;

const SYNTH_SYSTEM = `You are a friendly local guide for WhereTo30A, focused on Florida's 30A corridor.
ONLY recommend businesses from the CANDIDATES list. Use business_id from candidates only.
Output JSON with recommendations[], search_summary, optional suggestions[].`;

export async function parseIntentWithOpenAI(
  model: string,
  apiKey: string,
  rawQuery: string,
  normalizedQuery: string,
): Promise<SearchIntent> {
  const openai = new OpenAI({ apiKey });
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PARSE_SYSTEM },
      {
        role: "user",
        content:
          `User query (verbatim):\n${rawQuery.trim()}\n\n` +
          `Normalized (lowercase, punctuation stripped for matching):\n${normalizedQuery.trim()}`,
      },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Empty parse response");
  const raw = JSON.parse(text) as unknown;
  return searchIntentSchema.parse(raw);
}

export async function synthesizeWithOpenAI(
  model: string,
  apiKey: string,
  originalQuery: string,
  intent: SearchIntent,
  candidates: BusinessRowWithTags[],
): Promise<unknown> {
  const openai = new OpenAI({ apiKey });
  const compact = candidates.map((b) => ({
    id: b.id,
    name: b.name,
    town_id: b.town_id,
    rating: b.listing_rating,
    reviews: b.listing_review_count,
    price: b.price_level,
    tags: b.tag_slugs,
    summary: b.ai_summary,
  }));
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYNTH_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          original_query: originalQuery,
          intent,
          candidates: compact,
        }),
      },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Empty synthesis response");
  return JSON.parse(text) as unknown;
}

/** Keyword fallback when OpenAI parse is unavailable. */
export function fallbackIntentFromKeywords(normalized: string): SearchIntent {
  const base = {
    subcategory: null,
    exclude_attributes: [],
    sort_preference: "quality" as const,
    price_level: null,
    result_count: 10,
    specific_items: [],
    dietary_needs: [],
    meal_period: null,
    atmosphere_needs: [],
    occasion: null,
    query_type: "keyword" as const,
  };
  const attributes: string[] = [];
  if (/\bkid|family|children\b/.test(normalized)) attributes.push("kid_friendly");
  if (/\bcoffee|cafe|espresso\b/.test(normalized)) {
    return { ...base, category: "coffee_shops", location: { town: extractTown(normalized), radius: "near" }, attributes };
  }
  if (/\b(hamburgers?|cheeseburgers?|burgers?)\b/i.test(normalized)) {
    const stems = ["hamburger", "burger"];
    if (/\bcheese\s*burger|cheeseburgers?\b/i.test(normalized)) stems.push("cheeseburger");
    return {
      ...base,
      category: "restaurants",
      query_type: "specific",
      specific_items: stems,
      location: { town: extractTown(normalized), radius: "near" },
      attributes,
    };
  }
  if (/\b(ice cream|gelato|frozen yogurt|fro\s*yo)\b/i.test(normalized)) {
    return {
      ...base,
      category: "restaurants",
      query_type: "specific",
      specific_items: ["ice cream", "gelato", "frozen yogurt"],
      location: { town: extractTown(normalized), radius: "near" },
      attributes,
    };
  }
  if (/\b(donuts?|doughnuts?)\b/i.test(normalized)) {
    return {
      ...base,
      category: "restaurants",
      query_type: "specific",
      specific_items: ["donuts", "doughnuts"],
      location: { town: extractTown(normalized), radius: "near" },
      attributes,
    };
  }
  if (
    /\b(book|books|bookstore|bookshops?|novels?|graphic\s+novels?|literature)\b/i.test(normalized)
  ) {
    return {
      ...base,
      category: "shopping",
      query_type: "specific",
      specific_items: ["books", "bookstore", "reading"],
      location: { town: extractTown(normalized), radius: "near" },
      attributes,
    };
  }
  if (/\bbrunch|breakfast|lunch|dinner|restaurant|eat|dining\b/.test(normalized)) {
    return { ...base, category: "restaurants", location: { town: extractTown(normalized), radius: "near" }, attributes };
  }
  if (
    /\b(landscap|lawn care|handyman|painter|paint(ing)?|plumb|electric|contractor|hvac|cleaning|pressure wash|home repair|trades?|spa|salon|wellness|beauty)\b/.test(normalized)
  ) {
    return { ...base, category: "services", location: { town: extractTown(normalized), radius: "near" }, attributes };
  }
  return { ...base, category: "restaurants", location: { town: extractTown(normalized), radius: "anywhere" }, attributes };
}

function extractTown(normalized: string): string | null {
  const towns: [string, string][] = [
    ["carillon", "carillon-beach"],
    ["inlet", "inlet-beach"],
    ["rosemary", "rosemary-beach"],
    ["seacrest", "seacrest-beach"],
    ["alys", "alys-beach"],
    ["watersound", "watersound"],
    ["seagrove", "seagrove-beach"],
    ["seaside", "seaside"],
    ["watercolor", "watercolor"],
    ["grayton", "grayton-beach"],
    ["blue mountain", "blue-mountain-beach"],
    ["santa rosa", "santa-rosa-beach"],
    ["gulf place", "gulf-place"],
    ["dune allen", "dune-allen-beach"],
    ["sandestin", "sandestin"],
  ];
  for (const [needle, slug] of towns) {
    if (normalized.includes(needle)) return slug;
  }
  return null;
}
