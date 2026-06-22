/**
 * Derive v2 search document fields from existing business columns.
 * Used by ingestion scripts and `scripts/backfill-search-document.ts`.
 */

export type SearchDocumentSource = {
  title: string | null;
  excerpt: string | null;
  business_type: string | null;
  search_keywords: string | null;
  item_tags?: string[] | null;
  dietary_tags?: string[] | null;
  atmosphere_tags?: string[] | null;
  occasion_tags?: string[] | null;
  meal_period_tags?: string[] | null;
};

export type SearchDocumentFields = {
  search_tags: string[];
  search_terms: string;
  embedding_summary: string;
};

/** Only emits tags that exist in search_tags_vocabulary (see validate-tag-registry). */
const BUSINESS_TYPE_TAG_INFERENCES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /coffee|cafe|espresso|latte/i, tag: "coffee" },
  { pattern: /golf\s*course|golf\s*club|putting/i, tag: "golf" },
  { pattern: /bookstore|book\s*store|book\s*shop/i, tag: "books" },
  { pattern: /cart\s*rental|lsv\s*rental|mobility\s*rental/i, tag: "mobility_rental" },
];

export function deriveSearchTags(row: SearchDocumentSource): string[] {
  const tags = new Set<string>(
    [
      ...(row.item_tags ?? []),
      ...(row.dietary_tags ?? []),
      ...(row.atmosphere_tags ?? []),
      ...(row.occasion_tags ?? []),
      ...(row.meal_period_tags ?? []),
    ].filter(Boolean),
  );

  const bt = row.business_type ?? "";
  for (const { pattern, tag } of BUSINESS_TYPE_TAG_INFERENCES) {
    if (pattern.test(bt)) tags.add(tag);
  }

  if (/cart\s*rental|lsv\s*rental/i.test(row.title ?? "")) {
    tags.add("mobility_rental");
  }

  if (tags.size === 0 && row.business_type) {
    row.business_type
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((w) => w.length > 3)
      .forEach((w) => tags.add(w));
  }

  return [...tags].filter((s) => s.length > 0);
}

export function deriveSearchTerms(row: SearchDocumentSource): string {
  const parts = [row.business_type, row.search_keywords].filter(Boolean) as string[];
  const tokens = parts.join(" ").split(/\s+/).filter(Boolean);
  return [...new Set(tokens)].join(" ");
}

export function deriveEmbeddingSummary(row: SearchDocumentSource): string {
  const parts = [row.title, row.excerpt].filter(Boolean) as string[];
  return parts.join(". ").slice(0, 500);
}

export function buildSearchDocumentFields(row: SearchDocumentSource): SearchDocumentFields {
  return {
    search_tags: deriveSearchTags(row),
    search_terms: deriveSearchTerms(row),
    embedding_summary: deriveEmbeddingSummary(row),
  };
}
