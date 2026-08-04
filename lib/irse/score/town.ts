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
    pass(
      25,
      input.has_planning_profile,
      {
        severity: "warning",
        code: "entity_no_planning_profile",
        message: "No town at-a-glance facts in the database.",
      },
      "Add town_facts columns for this town (metrics, highlights, detail cards).",
    ),
    // Distinctive entity signal — templated hubs fail this even when published.
    pass(
      15,
      present(input.title) && !input.seo_title_templated,
      {
        severity: "warning",
        code: "entity_templated_positioning",
        message: "Town SEO positioning uses a shared template across hubs.",
      },
      "Write a town-specific SEO title (not the shared Stay/Eat/Explore pattern).",
    ),
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
  const overlap = clamp01(input.content_overlap_max);

  let lenPoints = 0;
  if (len >= 600) lenPoints = 25;
  else if (len >= 250) lenPoints = 15;
  else if (len >= 80) lenPoints = 6;
  // Near-duplicate long copy is worse than short unique copy for indexability.
  if (overlap >= 0.45) lenPoints = Math.min(lenPoints, 6);
  else if (overlap >= 0.35) lenPoints = Math.min(lenPoints, 12);

  let uniqPoints = 25;
  if (overlap >= 0.45) uniqPoints = 0;
  else if (overlap >= 0.38) uniqPoints = 6;
  else if (overlap >= 0.3) uniqPoints = 14;
  else if (overlap >= 0.2) uniqPoints = 20;

  return fromContributions([
    partial(
      25,
      lenPoints,
      len < 80
        ? { severity: "critical", code: "content_thin", message: "Town content is too short." }
        : len < 250
          ? { severity: "warning", code: "content_weak", message: "Town content is thin." }
          : overlap >= 0.35
            ? {
                severity: "warning",
                code: "content_length_but_overlapping",
                message: "Town has long copy but it overlaps heavily with other town hubs.",
              }
            : undefined,
      overlap >= 0.35
        ? "Rewrite with place-specific facts — length alone does not make this unique."
        : len < 250
          ? "Expand the town introduction with local context."
          : undefined,
    ),
    partial(
      25,
      uniqPoints,
      overlap >= 0.35
        ? {
            severity: "critical",
            code: "content_near_duplicate",
            message: `Town copy overlaps other hubs (~${Math.round(overlap * 100)}% token Jaccard).`,
          }
        : undefined,
      overlap >= 0.35
        ? "Differentiate this town page from sibling hubs (unique sections, local entities, FAQs)."
        : undefined,
    ),
    pass(10, words >= 60, {
      severity: "warning",
      code: "content_low_word_count",
      message: "Town copy is short.",
    }),
    partial(
      15,
      Math.min(15, input.planning_faq_count * 5),
      {
        severity: "warning",
        code: "content_no_faqs",
        message: "Few or no at-a-glance detail cards for this town.",
      },
      "Fill beach/getting-around/dining/parking detail fields on the town.",
    ),
    partial(10, Math.min(10, input.planning_nearby_count * 4), {
      severity: "info",
      code: "content_no_nearby_towns",
      message: "Highlights missing from town at-a-glance facts.",
    }),
    pass(
      10,
      hasImage(input),
      {
        severity: "warning",
        code: "content_missing_images",
        message: "Town is missing a hero image.",
      },
      "Add a strong town hero image.",
    ),
    partial(
      5,
      aiHits === 0 ? 5 : 1,
      aiHits > 0
        ? { severity: "warning", code: "content_generic_ai", message: "Generic AI phrasing detected." }
        : undefined,
    ),
  ]);
}

export function scoreTownSeo(input: TownIrseInput): CategoryCheckResult {
  const title = input.seo_title?.trim() || input.title?.trim() || "";
  const desc = input.seo_description?.trim() || input.excerpt?.trim() || "";
  const uniqueTitle = title.length >= 10 && !input.seo_title_templated;
  return fromContributions([
    pass(
      30,
      uniqueTitle,
      {
        severity: "critical",
        code: "seo_templated_title",
        message: input.seo_title_templated
          ? "SEO title uses the shared Stay/Eat/Explore template."
          : "SEO title is missing or short.",
      },
      "Write a unique seo_title for this town (avoid the shared template).",
    ),
    pass(
      25,
      metaLengthOk(desc, 50, 320) || desc.length >= 50,
      {
        severity: "warning",
        code: "seo_weak_description",
        message: "SEO description is missing or weak.",
      },
      "Set seo_description (~120–160 characters).",
    ),
    pass(
      20,
      hasImage(input),
      {
        severity: "warning",
        code: "seo_og_image",
        message: "Missing hero image for OG / social preview.",
      },
      "Add a town hero image used for Open Graph.",
    ),
    // Technical template features are table stakes — small credit only.
    pass(15, true),
  ]);
}

export function scoreTownDiscovery(input: TownIrseInput): CategoryCheckResult {
  return fromContributions([
    partial(
      30,
      Math.min(30, input.listing_count),
      {
        severity: "warning",
        code: "discovery_few_listings",
        message: "Few businesses associated with this town.",
      },
      "Grow listing coverage for this town.",
    ),
    // Guides are a strong internal discovery signal — 0 guides = 0 points.
    partial(
      35,
      Math.min(35, input.guide_count * 35),
      {
        severity: "warning",
        code: "discovery_few_guides",
        message: "No guides (or too few) link this town.",
      },
      "Publish or link at least one guide that features this town.",
    ),
    partial(
      20,
      Math.min(20, input.area_count * 10),
      {
        severity: "info",
        code: "discovery_few_areas",
        message: "Few area/POI pages linked under this town.",
      },
      "Publish area hubs for neighborhoods inside this town.",
    ),
    pass(
      15,
      input.has_planning_profile &&
        (input.planning_nearby_count > 0 || input.area_count > 0),
      {
        severity: "info",
        code: "discovery_planning_links",
        message: "Town facts lack highlights and no area hubs are linked.",
      },
    ),
  ]);
}

export function scoreTownTrust(input: TownIrseInput): CategoryCheckResult {
  const overlap = clamp01(input.content_overlap_max);
  const uniquenessTrust =
    overlap >= 0.45 ? 0 : overlap >= 0.38 ? 5 : overlap >= 0.3 ? 12 : 25;

  return fromContributions([
    pass(
      25,
      input.has_planning_profile,
      {
        severity: "warning",
        code: "trust_no_editorial_profile",
        message: "No at-a-glance town facts for trust signals.",
      },
    ),
    pass(
      20,
      hasImage(input),
      {
        severity: "info",
        code: "trust_photo_proxy",
        message: "Image presence used as a trust proxy.",
      },
    ),
    pass(
      15,
      input.listing_count >= 5,
      {
        severity: "info",
        code: "trust_thin_coverage",
        message: "Town has sparse business coverage.",
      },
    ),
    pass(
      15,
      present(input.content) || present(input.excerpt),
      {
        severity: "warning",
        code: "trust_no_editorial",
        message: "No editorial content on the town page.",
      },
    ),
    partial(
      25,
      uniquenessTrust,
      overlap >= 0.35
        ? {
            severity: "warning",
            code: "trust_templated_hub",
            message: "High overlap with other town hubs weakens trust / uniqueness.",
          }
        : undefined,
      overlap >= 0.35
        ? "Replace shared boilerplate with verified local detail unique to this town."
        : undefined,
    ),
  ]);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
