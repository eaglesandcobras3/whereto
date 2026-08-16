import { titleSegmentForLayoutTemplate } from "@/lib/seo/metadata-title";

/** Visible title budget after root layout applies `"%s | WhereTo30A"`. */
export const SEO_TITLE_LAYOUT_SUFFIX = " | WhereTo30A";
export const SEO_TITLE_MAX_VISIBLE = 60;
export const SEO_TITLE_MAX_SEGMENT =
  SEO_TITLE_MAX_VISIBLE - SEO_TITLE_LAYOUT_SUFFIX.length;

export const SEO_META_DESCRIPTION_MIN = 70;
export const SEO_META_DESCRIPTION_MAX = 155;

/** Truncate at a word boundary with an ellipsis when over `max` (meta descriptions). */
export function truncateAtWordBoundary(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.55) return `${cut.slice(0, lastSpace).trim()}…`;
  return `${cut}…`;
}

/**
 * Fit a title segment into the layout budget without an ellipsis.
 * SERP titles already clip visually — shipping `…` wastes characters.
 */
export function truncateTitleSegment(text: string, max: number = SEO_TITLE_MAX_SEGMENT): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.55) return cut.slice(0, lastSpace).trim();
  return cut;
}

/** Page title segment for the root layout template (strips duplicate brand, enforces length). */
export function seoTitleSegmentForLayout(value: string | null | undefined): string {
  const segment = titleSegmentForLayoutTemplate(value);
  if (!segment) return "";
  return truncateTitleSegment(segment, SEO_TITLE_MAX_SEGMENT);
}

/**
 * Prefer a CMS/audit title when it fits the budget; otherwise use a complete
 * fallback instead of mid-phrase truncation with an ellipsis.
 */
export function preferTitleWithinBudget(
  preferred: string | null | undefined,
  fallback: string,
): string {
  const primary = titleSegmentForLayoutTemplate(preferred);
  if (primary && primary.length <= SEO_TITLE_MAX_SEGMENT) return primary;
  const fb = titleSegmentForLayoutTemplate(fallback);
  if (fb && fb.length <= SEO_TITLE_MAX_SEGMENT) return fb;
  return truncateTitleSegment(primary || fb || "", SEO_TITLE_MAX_SEGMENT);
}

/** Compact town title that fits the layout segment budget without ellipsis. */
export function townTitleSegment(townName: string): string {
  const name = townName.trim();
  const candidates = [
    `${name}: Stay, Eat & Beach on 30A`,
    `${name}: Stay, Eat & Explore on 30A`,
    `${name} Florida: Stay, Eat & Beach`,
    `${name}: 30A Stay, Eat & Beach`,
    `${name} Travel Guide`,
    `${name} Guide`,
  ];
  for (const candidate of candidates) {
    if (candidate.length <= SEO_TITLE_MAX_SEGMENT) return candidate;
  }
  return truncateTitleSegment(`${name} Guide`, SEO_TITLE_MAX_SEGMENT);
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
