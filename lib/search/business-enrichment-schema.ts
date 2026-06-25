import { z } from "zod";

/** LLM output shape — mirrors enriched CSV columns (stores2 / services import). */
export const businessEnrichmentSchema = z.object({
  business_type: z.string().min(2).max(80),
  item_tags: z.array(z.string()).max(12),
  dietary_tags: z.array(z.string()).max(8),
  meal_period_tags: z.array(z.string()).max(6),
  atmosphere_tags: z.array(z.string()).max(8),
  occasion_tags: z.array(z.string()).max(8),
  qa_document: z.string().min(40).max(2000),
  search_profile: z.string().min(20).max(600),
  price_level: z.number().int().min(1).max(4).nullable(),
  category_slug: z
    .enum([
      "restaurants",
      "coffee_shops",
      "bars",
      "shopping",
      "boutiques",
      "candy_sweets",
      "ice_cream",
      "specialty_retail",
      "activities",
      "events",
      "beaches",
      "services",
      "banking",
      "contractors",
    ])
    .nullable(),
});

export type BusinessEnrichment = z.infer<typeof businessEnrichmentSchema>;

export type BusinessEnrichmentInput = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  search_keywords: string | null;
  town_name: string | null;
  is_service_business: boolean;
  is_storefront: boolean;
};

const TAG_GUIDE = `
Use snake_case tags only. Examples:
- item_tags: coffee, tea, jewelry, gifts, clothing, accessories, art, dining, lunch, dinner, paddleboard, kayak
- dietary_tags: vegan, gluten_free, vegetarian (empty array if N/A)
- meal_period_tags: breakfast, brunch, lunch, dinner, late_night (empty if not food)
- atmosphere_tags: beachfront, casual, upscale, family_friendly, romantic, outdoor_seating
- occasion_tags: souvenir_shopping, girls_trip, date_night, family_outing, quick_bite, rainy_day
`.trim();

export function buildBusinessEnrichmentPrompt(
  listings: BusinessEnrichmentInput[],
  vocabSample?: string[],
): string {
  const lines = listings
    .map((b, i) => {
      const desc = (b.excerpt ?? b.content ?? "").slice(0, 400);
      return `${i + 1}. id=${b.id}
   title: ${b.title}
   town: ${b.town_name ?? "30A area"}
   storefront: ${b.is_storefront} | service: ${b.is_service_business}
   excerpt: ${desc || "(none)"}
   keywords: ${b.search_keywords ?? "(none)"}`;
    })
    .join("\n\n");

  const vocabLine =
    vocabSample && vocabSample.length > 0
      ? `\nPrefer item_tags from this vocabulary when applicable: ${vocabSample.slice(0, 40).join(", ")}`
      : "";

  return `You enrich Florida 30A / Emerald Coast business directory listings for search and discovery.

For EACH listing, return one object keyed by exact id with:
- business_type: short label (e.g. "jewelry store", "coffee shop", "restaurant")
- item_tags, dietary_tags, meal_period_tags, atmosphere_tags, occasion_tags: string arrays (snake_case)
- qa_document: 5-8 short Q&A lines (plain text, no markdown):
  What type of place is this?
  What can you get here?
  Who is it for?
  What occasion or situation fits?
  What's the atmosphere like?
  What's the price range?
- search_profile: 2-3 sentences, keyword-rich, for semantic search (no markdown)
- price_level: 1-4 or null if unknown ($=1, $$$$=4)
- category_slug: best matching business_categories slug, or null if unsure

${TAG_GUIDE}${vocabLine}

LISTINGS:
${lines}

Be accurate to the listing text. Do not invent specific menu items or services not implied by the data.
Food businesses should have meal_period_tags; retail should have souvenir_shopping or girls_trip when appropriate.`;
}

export const batchEnrichmentResponseSchema = z.object({
  enrichments: z.array(
    z.object({
      id: z.string(),
    }).merge(businessEnrichmentSchema),
  ),
});

export type BusinessEnrichmentFields = Omit<BusinessEnrichment, "category_slug">;

export function enrichmentToDbRow(
  enrichment: BusinessEnrichmentFields,
  now = new Date().toISOString(),
): Record<string, unknown> {
  return {
    business_type: enrichment.business_type,
    item_tags: enrichment.item_tags,
    dietary_tags: enrichment.dietary_tags,
    meal_period_tags: enrichment.meal_period_tags,
    atmosphere_tags: enrichment.atmosphere_tags,
    occasion_tags: enrichment.occasion_tags,
    qa_document: enrichment.qa_document,
    search_profile: enrichment.search_profile,
    price_level: enrichment.price_level,
    qa_document_updated_at: now,
    search_profile_updated_at: now,
  };
}

export function businessNeedsEnrichment(row: {
  business_type: string | null;
  search_profile: string | null;
  item_tags: string[] | null;
  embedding: unknown;
}): boolean {
  const hasTags = Array.isArray(row.item_tags) && row.item_tags.length > 0;
  return !row.business_type || !row.search_profile || !hasTags || !row.embedding;
}
