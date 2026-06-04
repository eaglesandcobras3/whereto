import { titleSegmentForLayoutTemplate } from "@/lib/seo/metadata-title";

/** Visible title budget after root layout applies `"%s | WhereTo30A"`. */
export const SEO_TITLE_LAYOUT_SUFFIX = " | WhereTo30A";
export const SEO_TITLE_MAX_VISIBLE = 60;
export const SEO_TITLE_MAX_SEGMENT =
  SEO_TITLE_MAX_VISIBLE - SEO_TITLE_LAYOUT_SUFFIX.length;

export const SEO_META_DESCRIPTION_MIN = 70;
export const SEO_META_DESCRIPTION_MAX = 155;

/** Truncate at a word boundary with an ellipsis when over `max`. */
export function truncateAtWordBoundary(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.55) return `${cut.slice(0, lastSpace).trim()}…`;
  return `${cut}…`;
}

/** Page title segment for the root layout template (strips duplicate brand, enforces length). */
export function seoTitleSegmentForLayout(value: string | null | undefined): string {
  const segment = titleSegmentForLayoutTemplate(value);
  if (!segment) return "";
  return truncateAtWordBoundary(segment, SEO_TITLE_MAX_SEGMENT);
}

/**
 * Meta description for SERP snippets — pads thin copy, caps long excerpts.
 */
export function metaDescriptionSnippet(
  primary: string | null | undefined,
  fallback: string,
): string {
  let text = (primary ?? "").trim() || fallback.trim();
  if (text.length < SEO_META_DESCRIPTION_MIN) {
    const suffix = " Browse local picks and travel guides on WhereTo30A.";
    if (!text.endsWith("WhereTo30A") && !text.endsWith("WhereTo30a")) {
      text = `${text}${suffix}`.trim();
    }
  }
  return truncateAtWordBoundary(text, SEO_META_DESCRIPTION_MAX);
}

/** Business listing title: `Name | Category in Town` within layout budget. */
export function businessListingTitleSegment(
  name: string,
  suffixParts: Array<string | null | undefined>,
): string {
  const suffix = suffixParts.filter(Boolean).join(" ");
  const raw = suffix ? `${name.trim()} | ${suffix}` : name.trim();
  return seoTitleSegmentForLayout(raw);
}
