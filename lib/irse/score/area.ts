import type { AreaIrseInput } from "../inputs";
import type { CategoryCheckResult } from "../types";
import { GENERIC_AI_PHRASES } from "../weights";
import {
  countGenericAiPhrases,
  fromContributions,
  hasImage,
  metaLengthOk,
  partial,
  pass,
  present,
  textLen,
  wordCount,
} from "../checks/helpers";

export function scoreAreaEntity(input: AreaIrseInput): CategoryCheckResult {
  return fromContributions([
    pass(20, present(input.title), {
      severity: "critical",
      code: "entity_missing_name",
      message: "Area name is missing.",
    }),
    pass(15, present(input.slug), {
      severity: "critical",
      code: "entity_missing_slug",
      message: "Slug is missing.",
    }),
    pass(15, input.town_id != null, {
      severity: "warning",
      code: "entity_missing_town",
      message: "Area is not associated with a town.",
    }, "Link the area to its parent town."),
    pass(15, input.has_planning_profile, {
      severity: "info",
      code: "entity_no_planning_profile",
      message: "No area at-a-glance facts in the database.",
    }, "Add area_facts columns for this area (metrics, highlights, detail cards)."),
    pass(15, true), // Place schema on template
    pass(10, input.place_kind === "area" || input.place_kind === "poi"),
    pass(10, input.status === "published" || input.status == null, {
      severity: "critical",
      code: "entity_not_published",
      message: "Area/POI is not published.",
    }),
  ]);
}

export function scoreAreaContent(input: AreaIrseInput): CategoryCheckResult {
  const len = textLen(input.excerpt, input.content);
  const words = wordCount(input.excerpt, input.content);
  const combined = [input.excerpt, input.content].filter(Boolean).join("\n");
  const aiHits = countGenericAiPhrases(combined, GENERIC_AI_PHRASES);

  let lenPoints = 0;
  if (len >= 500) lenPoints = 30;
  else if (len >= 200) lenPoints = 18;
  else if (len >= 60) lenPoints = 8;

  return fromContributions([
    partial(
      30,
      lenPoints,
      len < 60
        ? { severity: "critical", code: "content_thin", message: "Area content is too short." }
        : len < 200
          ? { severity: "warning", code: "content_weak", message: "Area content is thin." }
          : undefined,
      len < 200 ? "Expand the area introduction with specific local detail." : undefined,
    ),
    pass(15, words >= 40, {
      severity: "warning",
      code: "content_low_word_count",
      message: "Area copy is short.",
    }),
    partial(20, Math.min(20, input.planning_faq_count * 7), {
      severity: "info",
      code: "content_no_faqs",
      message: "Few or no at-a-glance detail cards for this area.",
    }),
    partial(15, Math.min(15, input.planning_nearby_count * 5), {
      severity: "info",
      code: "content_no_highlights",
      message: "Highlights missing from area at-a-glance facts.",
    }),
    pass(10, hasImage(input), {
      severity: "warning",
      code: "content_missing_images",
      message: "Area is missing a hero image.",
    }),
    partial(
      10,
      aiHits === 0 ? 10 : 4,
      aiHits > 0
        ? { severity: "warning", code: "content_generic_ai", message: "Generic AI phrasing detected." }
        : undefined,
    ),
  ]);
}

export function scoreAreaSeo(input: AreaIrseInput): CategoryCheckResult {
  const title = input.seo_title?.trim() || input.title?.trim() || "";
  const desc = input.seo_description?.trim() || input.excerpt?.trim() || "";
  return fromContributions([
    pass(20, title.length >= 8, {
      severity: "warning",
      code: "seo_weak_title",
      message: "Title is missing or short.",
    }),
    pass(25, metaLengthOk(desc, 40, 320) || desc.length >= 40, {
      severity: "warning",
      code: "seo_weak_description",
      message: "SEO description is missing or weak.",
    }, "Set seo_description for this area."),
    pass(15, hasImage(input)),
    pass(20, true),
    pass(20, true),
  ]);
}

export function scoreAreaDiscovery(input: AreaIrseInput): CategoryCheckResult {
  return fromContributions([
    partial(35, Math.min(35, input.listing_count * 3), {
      severity: "warning",
      code: "discovery_few_listings",
      message: "Few businesses associated with this area.",
    }),
    partial(30, Math.min(30, input.guide_count * 10), {
      severity: "info",
      code: "discovery_few_guides",
      message: "Few guides linked to this area.",
    }),
    pass(20, input.town_id != null, {
      severity: "warning",
      code: "discovery_no_town_parent",
      message: "Missing town parent reduces hub discovery.",
    }),
    pass(15, true),
  ]);
}

export function scoreAreaTrust(input: AreaIrseInput): CategoryCheckResult {
  return fromContributions([
    pass(30, present(input.content) || present(input.excerpt), {
      severity: "warning",
      code: "trust_no_editorial",
      message: "No editorial content on the area page.",
    }),
    pass(25, hasImage(input)),
    pass(25, input.has_planning_profile || input.listing_count >= 3, {
      severity: "info",
      code: "trust_thin_signals",
      message: "Limited trust signals (at-a-glance facts or listings).",
    }),
    pass(20, input.town_id != null),
  ]);
}
