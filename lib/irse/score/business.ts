import type { BusinessIrseInput } from "../inputs";
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
  unavailable,
  wordCount,
} from "../checks/helpers";

export function scoreBusinessEntity(input: BusinessIrseInput): CategoryCheckResult {
  const contrib = [
    pass(10, present(input.title), {
      severity: "critical",
      code: "entity_missing_name",
      message: "Business name is missing.",
    }, "Set a clear business name."),
    pass(8, present(input.slug), {
      severity: "critical",
      code: "entity_missing_slug",
      message: "Slug is missing.",
    }),
    pass(10, present(input.address), {
      severity: "critical",
      code: "entity_missing_address",
      message: "Street address is missing.",
    }, "Add a complete street address."),
    pass(8, input.town_id != null, {
      severity: "critical",
      code: "entity_missing_town",
      message: "Town association is missing.",
    }, "Assign the listing to a town."),
    pass(
      6,
      input.area_id != null || present(input.area_slug),
      {
        severity: "warning",
        code: "entity_missing_area",
        message: "Area association is missing.",
      },
      "Link the listing to a neighborhood or area when applicable.",
    ),
    pass(
      8,
      input.map_lat != null && input.map_lng != null,
      {
        severity: "warning",
        code: "entity_missing_coordinates",
        message: "Map coordinates are missing.",
      },
      "Add latitude and longitude.",
    ),
    pass(6, present(input.website), {
      severity: "warning",
      code: "entity_missing_website",
      message: "Website is missing.",
    }, "Add the business website URL."),
    pass(6, present(input.phone), {
      severity: "warning",
      code: "entity_missing_phone",
      message: "Phone number is missing.",
    }, "Add a phone number."),
    pass(10, input.primary_category_id != null, {
      severity: "critical",
      code: "entity_missing_category",
      message: "Primary category is missing.",
    }, "Set a primary category."),
    pass(
      8,
      !input.likely_duplicate,
      {
        severity: "critical",
        code: "entity_duplicate",
        message: "This listing may be a duplicate of another business.",
      },
      "Review and merge duplicate listings.",
    ),
    // Canonical + schema assumed present on business page template
    pass(10, true),
    // Location consistency: town title present when town_id set
    pass(
      10,
      input.town_id == null || present(input.town_title),
      {
        severity: "warning",
        code: "entity_town_mismatch",
        message: "Town id is set but town title could not be resolved.",
      },
    ),
  ];
  return fromContributions(contrib);
}

export function scoreBusinessContent(input: BusinessIrseInput): CategoryCheckResult {
  const bodyLen = textLen(input.excerpt, input.content, input.overview);
  const words = wordCount(input.excerpt, input.content, input.overview);
  const combined = [input.excerpt, input.content, input.overview].filter(Boolean).join("\n");
  const aiHits = countGenericAiPhrases(combined, GENERIC_AI_PHRASES);

  let contentPoints = 0;
  if (bodyLen >= 400) contentPoints = 25;
  else if (bodyLen >= 200) contentPoints = 18;
  else if (bodyLen >= 80) contentPoints = 10;
  else contentPoints = 0;

  const contrib = [
    partial(
      25,
      contentPoints,
      bodyLen < 80
        ? {
            severity: "critical",
            code: "content_thin",
            message: "Editorial text is too short for indexing.",
          }
        : bodyLen < 200
          ? {
              severity: "warning",
              code: "content_weak",
              message: "Editorial description is thin.",
            }
          : undefined,
      bodyLen < 200
        ? "Expand the introduction by explaining what makes this location unique."
        : undefined,
    ),
    pass(
      10,
      words >= 40,
      {
        severity: "warning",
        code: "content_low_word_count",
        message: "Unique editorial summary is short.",
      },
      "Write a unique editorial summary with specific local detail.",
    ),
    unavailable(
      10,
      0.4,
      {
        severity: "info",
        code: "content_no_visitor_tips_field",
        message: "Visitor tips are not stored as a structured field on listings.",
      },
      "Add visitor tips in the editorial content (parking, timing, what to order).",
    ),
    unavailable(
      10,
      0.3,
      {
        severity: "warning",
        code: "content_no_faqs_field",
        message: "FAQs are not stored on business listings.",
      },
      "Add two FAQ-style answers in the editorial content.",
    ),
    unavailable(
      8,
      0.4,
      {
        severity: "info",
        code: "content_no_amenities_field",
        message: "Amenities are not stored as a structured field on listings.",
      },
      "Mention key amenities (parking, outdoor seating, reservations) in the copy.",
    ),
    pass(
      12,
      input.similar_count > 0,
      {
        severity: "warning",
        code: "content_no_nearby",
        message: "Nearby recommendations are missing.",
      },
      "Ensure related listings exist in the same town and category.",
    ),
    pass(
      10,
      hasImage(input),
      {
        severity: "warning",
        code: "content_missing_images",
        message: "No listing images found.",
      },
      "Add two additional interior or exterior photos.",
    ),
    partial(
      15,
      aiHits === 0 ? 15 : aiHits === 1 ? 8 : 0,
      aiHits > 0
        ? {
            severity: "warning",
            code: "content_generic_ai",
            message: `Generic AI phrasing detected (${aiHits} phrase${aiHits === 1 ? "" : "s"}).`,
          }
        : undefined,
      aiHits > 0
        ? "Rewrite generic phrases with specific observations about this location."
        : undefined,
    ),
  ];
  return fromContributions(contrib);
}

export function scoreBusinessSeo(input: BusinessIrseInput): CategoryCheckResult {
  const title = input.seo_title?.trim() || input.title?.trim() || "";
  const desc =
    input.seo_description?.trim() || input.excerpt?.trim() || input.overview?.trim() || "";

  const contrib = [
    pass(
      15,
      title.length >= 15,
      {
        severity: "warning",
        code: "seo_weak_title",
        message: "Title is missing or too short.",
      },
      "Set a descriptive SEO title including the town name.",
    ),
    pass(
      15,
      metaLengthOk(desc, 50, 320) || desc.length >= 50,
      {
        severity: "warning",
        code: "seo_weak_description",
        message: "Meta description is missing or weak.",
      },
      "Write a meta description of roughly 120–160 characters.",
    ),
    // Heading hierarchy + schema + canonical + OG assumed from page templates
    pass(12, true),
    pass(12, true),
    pass(10, hasImage(input), {
      severity: "info",
      code: "seo_image_alt_proxy",
      message: "Image alt text uses the business name when an image is present.",
    }),
    pass(12, true), // Open Graph / Twitter from shared helpers
    pass(
      12,
      input.status === "published",
      {
        severity: "critical",
        code: "seo_not_indexable_state",
        message: "Listing is not published.",
      },
      "Publish the listing.",
    ),
    pass(12, true), // structured data LocalBusiness on template
  ];
  return fromContributions(contrib);
}

export function scoreBusinessDiscovery(input: BusinessIrseInput): CategoryCheckResult {
  const linkScore =
    (input.linked_from_town ? 20 : 0) +
    (input.linked_from_category ? 20 : 0) +
    (input.linked_from_guide ? 25 : 0) +
    (input.linked_from_area ? 15 : 0);

  const contrib = [
    partial(
      80,
      linkScore,
      linkScore < 40
        ? {
            severity: "warning",
            code: "discovery_weak_internal_links",
            message:
              input.linked_from_category && !input.linked_from_town && !input.linked_from_guide
                ? "Only linked from category pages."
                : "Weak internal linking from hubs and guides.",
          }
        : undefined,
      linkScore < 40
        ? "Link this listing from its town hub and at least one guide."
        : undefined,
    ),
    partial(
      10,
      Math.min(10, input.similar_count * 3),
      input.similar_count === 0
        ? {
            severity: "info",
            code: "discovery_no_related",
            message: "No related listings found.",
          }
        : undefined,
      input.similar_count === 0 ? "Add nearby restaurants or related businesses." : undefined,
    ),
    partial(
      10,
      Math.min(10, input.guide_count * 5),
      input.guide_count === 0
        ? {
            severity: "info",
            code: "discovery_no_guides",
            message: "Not featured in any guide.",
          }
        : undefined,
      input.guide_count === 0
        ? "Feature this business in a relevant editorial guide."
        : undefined,
    ),
  ];
  return fromContributions(contrib);
}

export function scoreBusinessTrust(input: BusinessIrseInput): CategoryCheckResult {
  const claimed = (input.claim_status ?? "").toLowerCase() === "claimed";
  const updated = input.date_updated || input.published_at;
  const fresh =
    updated != null &&
    Date.now() - new Date(updated).getTime() < 180 * 24 * 60 * 60 * 1000;

  const contrib = [
    pass(
      20,
      claimed,
      {
        severity: "info",
        code: "trust_unclaimed",
        message: "Listing is not claimed by a business owner.",
      },
      "Invite the owner to claim and verify the listing.",
    ),
    pass(
      15,
      present(input.hours),
      {
        severity: "warning",
        code: "trust_missing_hours",
        message: "Hours are missing.",
      },
      "Add verified business hours.",
    ),
    pass(
      15,
      present(input.website),
      {
        severity: "warning",
        code: "trust_website_missing",
        message: "No website to verify liveness.",
      },
      "Add a live website URL.",
    ),
    pass(
      15,
      Boolean(updated),
      {
        severity: "info",
        code: "trust_no_update_date",
        message: "Last updated date is missing.",
      },
    ),
    pass(
      15,
      fresh || !updated,
      {
        severity: "warning",
        code: "trust_stale",
        message: "Listing has not been updated in over 6 months.",
      },
      "Review and refresh the listing content and hours.",
    ),
    pass(
      10,
      hasImage(input),
      {
        severity: "info",
        code: "trust_photo_quality_proxy",
        message: "Photo quality is not scored; presence of an image is used as a proxy.",
      },
      "Add clear, original photos of the space.",
    ),
    // Broken links not crawled in MVP scoring
    unavailable(
      10,
      0.5,
      {
        severity: "info",
        code: "trust_broken_links_not_checked",
        message: "Outbound link health is not checked in IRSE MVP.",
      },
    ),
  ];
  return fromContributions(contrib);
}
