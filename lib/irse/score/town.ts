import type { TownIrseInput } from "../inputs";
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

export function scoreTownEntity(input: TownIrseInput): CategoryCheckResult {
  return fromContributions([
    pass(25, present(input.title), {
      severity: "critical",
      code: "entity_missing_name",
      message: "Town name is missing.",
    }),
    pass(20, present(input.slug), {
      severity: "critical",
      code: "entity_missing_slug",
      message: "Slug is missing.",
    }),
    pass(20, input.has_planning_profile, {
      severity: "warning",
      code: "entity_no_planning_profile",
      message: "No town planning profile (vibe/FAQs/nearby) in code.",
    }, "Add a PlacePlanningProfile entry for this town."),
    pass(20, true), // TouristDestination schema on template
    pass(15, input.status === "published" || input.status == null, {
      severity: "critical",
      code: "entity_not_published",
      message: "Town is not published.",
    }),
  ]);
}

export function scoreTownContent(input: TownIrseInput): CategoryCheckResult {
  const len = textLen(input.excerpt, input.content);
  const words = wordCount(input.excerpt, input.content);
  const combined = [input.excerpt, input.content].filter(Boolean).join("\n");
  const aiHits = countGenericAiPhrases(combined, GENERIC_AI_PHRASES);

  let lenPoints = 0;
  if (len >= 600) lenPoints = 30;
  else if (len >= 250) lenPoints = 18;
  else if (len >= 80) lenPoints = 8;

  return fromContributions([
    partial(
      30,
      lenPoints,
      len < 80
        ? { severity: "critical", code: "content_thin", message: "Town content is too short." }
        : len < 250
          ? { severity: "warning", code: "content_weak", message: "Town content is thin." }
          : undefined,
      len < 250 ? "Expand the town introduction with local context." : undefined,
    ),
    pass(15, words >= 60, {
      severity: "warning",
      code: "content_low_word_count",
      message: "Town copy is short.",
    }),
    partial(20, Math.min(20, input.planning_faq_count * 7), {
      severity: "warning",
      code: "content_no_faqs",
      message: "No planning FAQs for this town.",
    }, "Add FAQs to the town planning profile."),
    partial(15, Math.min(15, input.planning_nearby_count * 5), {
      severity: "info",
      code: "content_no_nearby_towns",
      message: "Nearby town recommendations missing from planning profile.",
    }),
    pass(10, hasImage(input), {
      severity: "warning",
      code: "content_missing_images",
      message: "Town is missing a hero image.",
    }, "Add a strong town hero image."),
    partial(
      10,
      aiHits === 0 ? 10 : 4,
      aiHits > 0
        ? { severity: "warning", code: "content_generic_ai", message: "Generic AI phrasing detected." }
        : undefined,
    ),
  ]);
}

export function scoreTownSeo(input: TownIrseInput): CategoryCheckResult {
  const title = input.seo_title?.trim() || input.title?.trim() || "";
  const desc = input.seo_description?.trim() || input.excerpt?.trim() || "";
  return fromContributions([
    pass(20, title.length >= 10, {
      severity: "warning",
      code: "seo_weak_title",
      message: "SEO title is missing or short.",
    }),
    pass(25, metaLengthOk(desc, 50, 320) || desc.length >= 50, {
      severity: "warning",
      code: "seo_weak_description",
      message: "SEO description is missing or weak.",
    }, "Set seo_description (~120–160 characters)."),
    pass(15, hasImage(input), {
      severity: "info",
      code: "seo_og_image",
      message: "Hero image used for OG when present.",
    }),
    pass(20, true), // canonical + OG helpers
    pass(20, true), // TouristDestination + breadcrumbs
  ]);
}

export function scoreTownDiscovery(input: TownIrseInput): CategoryCheckResult {
  return fromContributions([
    partial(40, Math.min(40, input.listing_count * 2), {
      severity: "warning",
      code: "discovery_few_listings",
      message: "Few businesses associated with this town.",
    }, "Grow listing coverage for this town."),
    partial(30, Math.min(30, input.guide_count * 10), {
      severity: "info",
      code: "discovery_few_guides",
      message: "Few guides linked to this town.",
    }, "Publish or link guides for this town."),
    pass(15, input.has_planning_profile, {
      severity: "info",
      code: "discovery_planning_links",
      message: "Planning profile provides nearby town links when present.",
    }),
    pass(15, true), // /towns hub inclusion
  ]);
}

export function scoreTownTrust(input: TownIrseInput): CategoryCheckResult {
  return fromContributions([
    pass(30, input.has_planning_profile, {
      severity: "warning",
      code: "trust_no_editorial_profile",
      message: "No editorial planning profile for trust signals.",
    }),
    pass(25, hasImage(input), {
      severity: "info",
      code: "trust_photo_proxy",
      message: "Image presence used as a trust proxy.",
    }),
    pass(25, input.listing_count >= 5, {
      severity: "info",
      code: "trust_thin_coverage",
      message: "Town has sparse business coverage.",
    }),
    pass(20, present(input.content) || present(input.excerpt), {
      severity: "warning",
      code: "trust_no_editorial",
      message: "No editorial content on the town page.",
    }),
  ]);
}
