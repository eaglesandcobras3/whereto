import { z } from "zod";

export const guideEnrichmentSchema = z.object({
  seo_title: z.string().min(10).max(70),
  seo_description: z.string().min(50).max(160),
  og_title: z.string().min(10).max(70),
  og_description: z.string().min(50).max(200),
  search_keywords: z.array(z.string().min(2).max(40)).min(3).max(12),
  summary: z.string().min(40).max(400),
  excerpt: z.string().min(30).max(200),
  search_profile: z.string().min(40).max(600),
  intent_tags: z.array(z.string().min(2).max(40)).min(2).max(10),
});

export type GuideEnrichment = z.infer<typeof guideEnrichmentSchema>;

export type GuideEnrichmentInput = {
  id: string;
  title: string;
  content: string;
  guide_type: string | null;
  town_names: string[];
  area_names: string[];
  business_names: string[];
};

export function buildGuideEnrichmentPrompt(input: GuideEnrichmentInput): string {
  const preview = input.content.slice(0, 4000);
  const townLine =
    input.town_names.length > 0 ? input.town_names.join(", ") : "30A / Emerald Coast (general)";
  const areaLine = input.area_names.length > 0 ? input.area_names.join(", ") : "(none)";
  const bizLine =
    input.business_names.length > 0 ? input.business_names.join(", ") : "(none linked)";

  return `You enrich editorial travel guides for Florida's 30A / Emerald Coast for SEO and site search.

GUIDE:
- id: ${input.id}
- title: ${input.title}
- type: ${input.guide_type ?? "editorial"}
- towns: ${townLine}
- areas/places: ${areaLine}
- linked businesses: ${bizLine}

MARKDOWN BODY (truncated):
${preview}

Return ONE enrichment object with:
- seo_title: page title for Google (≤70 chars, include location when relevant)
- seo_description: meta description (≤160 chars, compelling, no quotes)
- og_title: social share title (can differ slightly from seo_title)
- og_description: social share blurb (≤200 chars)
- search_keywords: 5-10 lowercase phrases travelers might search (snake_case or plain words)
- summary: 2-3 sentence overview for hub cards and internal search
- excerpt: single punchy sentence teaser
- search_profile: 2-4 sentences, keyword-rich plain text for semantic search (no markdown)
- intent_tags: 3-8 snake_case tags (e.g. family_friendly, date_night, beach_day, dining, shopping, rainy_day, first_visit)

Be accurate to the guide content. Do not invent businesses or places not mentioned or implied.
Focus on what a visitor planning a 30A trip would search for.`;
}

export function enrichmentToGuidePatch(
  enrichment: GuideEnrichment,
  now = new Date().toISOString(),
): Record<string, unknown> {
  return {
    seo_title: enrichment.seo_title,
    seo_description: enrichment.seo_description,
    og_title: enrichment.og_title,
    og_description: enrichment.og_description,
    search_keywords: enrichment.search_keywords.join(", "),
    summary: enrichment.summary,
    excerpt: enrichment.excerpt,
    intent_tags: enrichment.intent_tags,
    custom_fields: {
      enriched_at: now,
      search_profile: enrichment.search_profile,
      enrichment_version: 1,
    },
  };
}
