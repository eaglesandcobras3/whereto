import type { CategoryIrseInput } from "../inputs";
import type { CategoryCheckResult } from "../types";
import {
  fromContributions,
  metaLengthOk,
  partial,
  pass,
  present,
  textLen,
} from "../checks/helpers";

export function scoreCategoryEntity(input: CategoryIrseInput): CategoryCheckResult {
  return fromContributions([
    pass(30, present(input.title), {
      severity: "critical",
      code: "entity_missing_name",
      message: "Category title is missing.",
    }),
    pass(25, present(input.slug), {
      severity: "critical",
      code: "entity_missing_slug",
      message: "Category slug is missing.",
    }),
    pass(25, present(input.public_path), {
      severity: "critical",
      code: "entity_missing_path",
      message: "Public hub path could not be resolved.",
    }),
    pass(20, input.status === "published" || input.status == null, {
      severity: "critical",
      code: "entity_not_published",
      message: "Category is not published.",
    }),
  ]);
}

export function scoreCategoryContent(input: CategoryIrseInput): CategoryCheckResult {
  const excerptLen = textLen(input.excerpt);
  return fromContributions([
    partial(
      35,
      excerptLen >= 120 ? 35 : excerptLen >= 40 ? 18 : excerptLen > 0 ? 8 : 0,
      excerptLen < 40
        ? {
            severity: "warning",
            code: "content_weak",
            message: "Category excerpt is thin or missing.",
          }
        : undefined,
      excerptLen < 120
        ? "Expand the category excerpt with what visitors will find on this hub."
        : undefined,
    ),
    pass(
      30,
      input.has_editorial_block,
      {
        severity: "info",
        code: "content_no_editorial_block",
        message: "No dedicated editorial block for this category hub.",
      },
      "Add hub editorial copy (restaurants/shopping pattern) when this category is a priority.",
    ),
    partial(35, Math.min(35, input.listing_count), {
      severity: "warning",
      code: "content_few_listings",
      message: "Hub has few listings to justify indexing.",
    }, "Grow listing coverage in this category."),
  ]);
}

export function scoreCategorySeo(input: CategoryIrseInput): CategoryCheckResult {
  const desc = input.excerpt?.trim() || "";
  return fromContributions([
    pass(
      25,
      input.has_audit_metadata || present(input.title),
      {
        severity: "warning",
        code: "seo_template_title",
        message: "Hub uses template metadata rather than audit-tuned copy.",
      },
      "Add audit-tuned title/description copy for this category hub.",
    ),
    pass(
      25,
      input.has_audit_metadata || metaLengthOk(desc, 50, 320) || desc.length >= 50,
      {
        severity: "warning",
        code: "seo_weak_description",
        message: "Hub meta description is weak.",
      },
    ),
    pass(20, true), // CollectionPage schema
    pass(15, true), // breadcrumbs
    pass(15, true), // canonical via categoryHubPath
  ]);
}

export function scoreCategoryDiscovery(input: CategoryIrseInput): CategoryCheckResult {
  return fromContributions([
    partial(40, Math.min(40, input.listing_count), {
      severity: "warning",
      code: "discovery_few_listings",
      message: "Few listings on this category hub.",
    }),
    partial(35, Math.min(35, input.town_coverage_count * 4), {
      severity: "warning",
      code: "discovery_narrow_town_coverage",
      message: "Listings cover few towns.",
    }, "Improve town coverage within this category."),
    pass(25, true), // nav / hub inclusion assumed for published categories
  ]);
}

export function scoreCategoryTrust(input: CategoryIrseInput): CategoryCheckResult {
  return fromContributions([
    pass(35, input.listing_count >= 10, {
      severity: "warning",
      code: "trust_thin_hub",
      message: "Category hub has fewer than 10 listings.",
    }),
    pass(30, input.town_coverage_count >= 3, {
      severity: "info",
      code: "trust_narrow_geography",
      message: "Hub covers fewer than three towns.",
    }),
    pass(
      35,
      input.has_editorial_block || textLen(input.excerpt) >= 80,
      {
        severity: "info",
        code: "trust_thin_editorial",
        message: "Limited editorial trust signals on the hub.",
      },
    ),
  ]);
}
