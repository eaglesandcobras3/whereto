import OpenAI from "openai";
import { searchIntentSchema, type SearchIntent } from "@/lib/intent-schema";
import type { BusinessRowWithTags } from "@/lib/scoring";

const PARSE_SYSTEM = `You are a query parser for WhereTo30A, a local business discovery app for Florida's 30A corridor.
Parse the user's natural language query into a structured search intent.

Towns (slugs): rosemary-beach, alys-beach, seaside, watercolor, grayton-beach, santa-rosa-beach, inlet-beach, seacrest-beach, watersound, blue-mountain-beach

Categories (slugs): restaurants, coffee_shops, bars, activities, shopping, services

Common tag slugs: kid_friendly, pet_friendly, outdoor_seating, romantic, casual, upscale, waterfront, live_music, gluten_free, vegan, vegetarian, seafood, mexican, italian, breakfast, lunch, dinner, brunch, coffee, date_night, groups, family, sunset_views

Output JSON only matching the schema fields: category, subcategory, location { town, radius }, attributes[], exclude_attributes[], sort_preference, price_level, result_count (1-12, default 10).`;

const SYNTH_SYSTEM = `You are a friendly local guide for WhereTo30A, focused on Florida's 30A corridor.
ONLY recommend businesses from the CANDIDATES list. Use business_id from candidates only.
Output JSON with recommendations[], search_summary, optional suggestions[].`;

export async function parseIntentWithOpenAI(
  model: string,
  apiKey: string,
  normalizedQuery: string,
): Promise<SearchIntent> {
  const openai = new OpenAI({ apiKey });
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PARSE_SYSTEM },
      { role: "user", content: normalizedQuery },
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
export function fallbackIntentFromKeywords(
  normalized: string,
): SearchIntent {
  const attributes: string[] = [];
  if (/\bkid|family|children\b/.test(normalized)) attributes.push("kid_friendly");
  if (/\bcoffee|cafe|espresso\b/.test(normalized)) {
    return {
      category: "coffee_shops",
      subcategory: null,
      location: { town: extractTown(normalized), radius: "near" },
      attributes,
      exclude_attributes: [],
      sort_preference: "quality",
      price_level: null,
      result_count: 10,
    };
  }
  if (/\bbrunch|breakfast|lunch|dinner|restaurant|eat|dining\b/.test(normalized)) {
    return {
      category: "restaurants",
      subcategory: null,
      location: { town: extractTown(normalized), radius: "near" },
      attributes,
      exclude_attributes: [],
      sort_preference: "quality",
      price_level: null,
      result_count: 10,
    };
  }
  if (
    /\b(landscap|lawn care|handyman|painter|paint(ing)?|plumb|electric|contractor|hvac|cleaning|pressure wash|home repair|trades?|spa|salon|wellness|beauty)\b/.test(
      normalized,
    )
  ) {
    return {
      category: "services",
      subcategory: null,
      location: { town: extractTown(normalized), radius: "near" },
      attributes,
      exclude_attributes: [],
      sort_preference: "quality",
      price_level: null,
      result_count: 10,
    };
  }
  return {
    category: "restaurants",
    subcategory: null,
    location: { town: extractTown(normalized), radius: "anywhere" },
    attributes,
    exclude_attributes: [],
    sort_preference: "quality",
    price_level: null,
    result_count: 10,
  };
}

function extractTown(normalized: string): string | null {
  const towns: [string, string][] = [
    ["seaside", "seaside"],
    ["rosemary", "rosemary-beach"],
    ["alys", "alys-beach"],
    ["watercolor", "watercolor"],
    ["grayton", "grayton-beach"],
    ["santa rosa", "santa-rosa-beach"],
    ["inlet", "inlet-beach"],
    ["seacrest", "seacrest-beach"],
    ["watersound", "watersound"],
    ["blue mountain", "blue-mountain-beach"],
  ];
  for (const [needle, slug] of towns) {
    if (normalized.includes(needle)) return slug;
  }
  return null;
}
