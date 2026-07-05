import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import { BUSINESS_CATEGORY_GROUP_SLUGS } from "@/lib/business-categories/groups";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";
import { SERVICE_CATEGORY_GROUP_SLUGS } from "@/lib/service-categories/groups";
import { normalizeQuery } from "@/lib/query-normalize";

const TOWN_SLUGS = [
  "carillon-beach",
  "inlet-beach",
  "rosemary-beach",
  "seacrest-beach",
  "alys-beach",
  "watersound",
  "seagrove-beach",
  "seaside",
  "watercolor",
  "grayton-beach",
  "blue-mountain-beach",
  "santa-rosa-beach",
  "gulf-place",
  "dune-allen-beach",
  "sandestin",
] as const;

export const discoverNlLlmSchema = z.object({
  type: z.enum(["storefront", "services"]).nullable(),
  town: z.string().nullable(),
  category: z.string().nullable(),
  service_category: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  unresolved_terms: z.array(z.string()).default([]),
  residual_q: z.string().nullable(),
});

export type DiscoverNlLlmParse = z.infer<typeof discoverNlLlmSchema>;

function buildSystemPrompt(vocabulary: readonly string[]): string {
  return `You parse natural-language queries for WhereTo30A /discover filter URLs.
Output JSON only. Map user intent to structured browse filters.

Storefront category groups (category field): ${BUSINESS_CATEGORY_GROUP_SLUGS.join(", ")}
Service category groups (service_category field): ${SERVICE_CATEGORY_GROUP_SLUGS.join(", ")}
Town slugs (town field): ${TOWN_SLUGS.join(", ")}

search_tags vocabulary — tags MUST be chosen ONLY from this list (snake_case slugs):
${vocabulary.join(", ")}

Rules:
- type "storefront" when category is set; "services" when service_category is set.
- Pick the closest category group for what the user is looking for (e.g. froyo / ice cream → category coffee_and_treats; plumber → service_category home_trades).
- tags: only vocabulary slugs that apply as hard filters (kid_friendly, gluten_free, lunch, coffee, etc.). Empty array if none.
- unresolved_terms: words/phrases the user wanted as a tag or product filter but have NO matching vocabulary slug (e.g. "froyo" when frozen_yogurt is not in vocabulary). Lowercase.
- residual_q: leftover free-text for title/keyword search after extracting town, category, and tags. Null if nothing meaningful remains.
- Handle misspellings and synonyms (gelatto → ice cream category; gluton free → gluten_free tag).
- Do not invent tag slugs outside the vocabulary list.`;
}

export async function parseDiscoverQueryWithLlm(
  rawQuery: string,
  vocabulary: ReadonlySet<string>,
  apiKey: string,
  model: string,
): Promise<DiscoverNlLlmParse | null> {
  const vocabList = [...vocabulary].sort((a, b) => a.localeCompare(b));
  if (!vocabList.length) return null;

  const openai = new OpenAI({ apiKey });
  const normalized = normalizeQuery(rawQuery);

  try {
    const res = await openai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(vocabList) },
        {
          role: "user",
          content:
            `User query (verbatim):\n${rawQuery.trim()}\n\n` +
            `Normalized:\n${normalized}`,
        },
      ],
    });

    const text = res.choices[0]?.message?.content;
    if (!text) return null;

    const raw = discoverNlLlmSchema.parse(JSON.parse(text));
    return sanitizeLlmParse(raw, vocabulary);
  } catch (err) {
    console.error("parseDiscoverQueryWithLlm", err);
    return null;
  }
}

function sanitizeLlmParse(
  raw: DiscoverNlLlmParse,
  vocabulary: ReadonlySet<string>,
): DiscoverNlLlmParse {
  const tags = raw.tags
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((t) => vocabulary.has(t));

  const town =
    raw.town?.trim() &&
    (TOWN_SLUGS as readonly string[]).includes(raw.town.trim())
      ? raw.town.trim()
      : null;

  const category = raw.category
    ? normalizeStorefrontCategoryGroupSlug(raw.category) ?? null
    : null;

  const service_category = raw.service_category
    ? normalizeServiceCategoryGroupSlug(raw.service_category) ?? null
    : null;

  let type = raw.type;
  if (service_category) type = "services";
  else if (category) type = "storefront";

  const unresolved_terms = [
    ...new Set(
      raw.unresolved_terms
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length >= 2),
    ),
  ];

  const residual_q = raw.residual_q?.trim() || null;

  return {
    type,
    town,
    category,
    service_category,
    tags,
    unresolved_terms,
    residual_q,
  };
}
