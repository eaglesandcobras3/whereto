import type { GuideIrseInput } from "../inputs";
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

export function scoreGuideEntity(input: GuideIrseInput): CategoryCheckResult {
  return fromContributions([
    pass(20, present(input.title), {
      severity: "critical",
      code: "entity_missing_name",
      message: "Guide title is missing.",
    }, "Set a clear guide title."),
    pass(15, present(input.slug), {
      severity: "critical",
      code: "entity_missing_slug",
      message: "Slug is missing.",
    }),
    pass(15, present(input.guide_type), {
      severity: "warning",
      code: "entity_missing_guide_type",
      message: "Guide type is missing.",
    }, "Set a guide type."),
    pass(
      20,
      input.town_link_count + input.area_link_count > 0,
      {
        severity: "warning",
        code: "entity_no_place_links",
        message: "Guide is not linked to any town or area.",
      },
      "Link the guide to relevant towns or areas.",
    ),
    pass(15, input.business_link_count > 0, {
      severity: "info",
      code: "entity_no_business_links",
      message: "Guide has no linked businesses.",
    }, "Link at least two businesses in the guide."),
    pass(15, true), // canonical from template
  ]);
}

export function scoreGuideContent(input: GuideIrseInput): CategoryCheckResult {
  const len = textLen(input.content, input.summary, input.excerpt);
  const words = wordCount(input.content, input.summary, input.excerpt);
  const combined = [input.content, input.summary, input.excerpt].filter(Boolean).join("\n");
  const aiHits = countGenericAiPhrases(combined, GENERIC_AI_PHRASES);

  let lenPoints = 0;
  if (len >= 1500) lenPoints = 35;
  else if (len >= 800) lenPoints = 25;
  else if (len >= 300) lenPoints = 12;
  else lenPoints = 0;

  return fromContributions([
    partial(
      35,
      lenPoints,
      len < 300
        ? {
            severity: "critical",
            code: "content_thin",
            message: "Guide body is too short.",
          }
        : len < 800
          ? {
              severity: "warning",
              code: "content_weak",
              message: "Guide body is thin for index readiness.",
            }
          : undefined,
      len < 800 ? "Expand the guide with specific local recommendations and tips." : undefined,
    ),
    pass(15, words >= 120, {
      severity: "warning",
      code: "content_low_word_count",
      message: "Guide word count is low.",
    }),
    pass(15, hasImage(input), {
      severity: "warning",
      code: "content_missing_images",
      message: "Guide is missing a hero image.",
    }, "Add an original hero image."),
    pass(15, input.business_link_count >= 2, {
      severity: "warning",
      code: "content_few_recommendations",
      message: "Fewer than two business recommendations are linked.",
    }, "Add specific business recommendations with wiki cards."),
    partial(
      20,
      aiHits === 0 ? 20 : aiHits === 1 ? 10 : 0,
      aiHits > 0
        ? {
            severity: "warning",
            code: "content_generic_ai",
            message: `Generic AI phrasing detected (${aiHits}).`,
          }
        : undefined,
      aiHits > 0 ? "Rewrite generic phrases with original observations." : undefined,
    ),
  ]);
}

export function scoreGuideSeo(input: GuideIrseInput): CategoryCheckResult {
  const title = input.seo_title?.trim() || input.title?.trim() || "";
  const desc = input.seo_description?.trim() || input.excerpt?.trim() || input.summary?.trim() || "";
  return fromContributions([
    pass(18, title.length >= 15, {
      severity: "warning",
      code: "seo_weak_title",
      message: "SEO title is missing or short.",
    }, "Set seo_title with a clear search intent."),
    pass(18, metaLengthOk(desc, 50, 320) || desc.length >= 50, {
      severity: "warning",
      code: "seo_weak_description",
      message: "SEO description is missing or weak.",
    }, "Write a meta description of roughly 120–160 characters."),
    pass(12, present(input.og_title) || present(input.seo_title) || present(input.title), {
      severity: "info",
      code: "seo_og_title",
      message: "Open Graph title falls back to SEO/title fields.",
    }),
    pass(12, present(input.og_description) || desc.length >= 50, {
      severity: "info",
      code: "seo_og_description",
      message: "Open Graph description falls back to SEO/excerpt fields.",
    }),
    pass(15, input.status === "published", {
      severity: "critical",
      code: "seo_not_published",
      message: "Guide is not published.",
    }, "Publish the guide before requesting indexing."),
    pass(12, hasImage(input), {
      severity: "warning",
      code: "seo_missing_og_image",
      message: "No image available for social/OG previews.",
    }),
    pass(13, true), // Article schema on template
  ]);
}

export function scoreGuideDiscovery(input: GuideIrseInput): CategoryCheckResult {
  return fromContributions([
    partial(30, Math.min(30, input.town_link_count * 15), {
      severity: "warning",
      code: "discovery_no_town",
      message: "Not linked from town hubs (no town associations).",
    }, "Associate the guide with at least one town."),
    partial(20, Math.min(20, input.area_link_count * 10)),
    partial(30, Math.min(30, input.business_link_count * 8), {
      severity: "info",
      code: "discovery_few_businesses",
      message: "Few business links reduce discoverability loops.",
    }),
    partial(20, Math.min(20, input.search_tags_count * 5), {
      severity: "info",
      code: "discovery_few_tags",
      message: "Search tags are sparse.",
    }, "Add intent and search tags for discoverability."),
  ]);
}

export function scoreGuideTrust(input: GuideIrseInput): CategoryCheckResult {
  const updated = input.date_updated || input.published_at;
  const fresh =
    updated != null &&
    Date.now() - new Date(updated).getTime() < 365 * 24 * 60 * 60 * 1000;
  return fromContributions([
    pass(30, Boolean(input.published_at), {
      severity: "warning",
      code: "trust_no_publish_date",
      message: "Published date is missing.",
    }),
    pass(25, Boolean(updated), {
      severity: "info",
      code: "trust_no_update_date",
      message: "Last updated date is missing.",
    }),
    pass(25, fresh || !updated, {
      severity: "warning",
      code: "trust_stale",
      message: "Guide has not been updated in over a year.",
    }, "Refresh outdated recommendations and publish dates."),
    pass(20, hasImage(input), {
      severity: "info",
      code: "trust_photo_proxy",
      message: "Hero image presence used as a trust proxy.",
    }),
  ]);
}
