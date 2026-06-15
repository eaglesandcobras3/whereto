import { normalizeQuery } from "@/lib/query-normalize";

export { normalizeQuery };

/**
 * Fully resolved routing plan for a single search query.
 *
 * Produced by resolveQueryPlan() from:
 *   1. Matched rule in data/search-query-rules.json (deterministic routing)
 *   2. Explicit UI filters from the caller (always win over rule-derived fields)
 *
 * Rules set WHICH BUCKET to search — not which business ranks #1.
 * SQL owns the score formula; this plan only narrows the candidate set.
 */
export type QueryPlan = {
  rawQuery: string;
  normalizedQuery: string;
  /** Matched rule id, or null when no rule matches (pure FTS+vector fallback). */
  matchedRuleId: string | null;
  /** Category slug passed to the V2 RPC as p_category_id lookup. */
  categorySlug: string | null;
  /** Service vendor category slug (private chef, photographer, etc.). */
  serviceCategorySlug: string | null;
  /** Hard filter: ALL must be present on business.search_tags (@>). Use sparingly —
   *  only for collision disambiguation where wrong-bucket results are unacceptable. */
  requiredTags: string[];
  /** Soft filter: any overlap (&&) boosts score but does not exclude. */
  anyTags: string[];
  /** Town slug for geo-scoped queries (from explicit UI filter, not rules). */
  townSlug: string | null;
  scope: "exact" | "near" | "anywhere";
  /** Tokens passed to the SQL FTS query (websearch_to_tsquery). */
  searchTerms: string[];
  priceLevel: number | null;
  vibeTags: string[];
};

/** Subset of RunSearchV2Options that can be expressed as routing overrides. */
export type ExplicitV2Filters = {
  townSlug?: string | null;
  categorySlug?: string | null;
  serviceCategorySlug?: string | null;
  priceLevel?: number | null;
  vibeTags?: string[];
  scope?: "exact" | "near" | "anywhere";
};

export function emptyQueryPlan(rawQuery: string, normalizedQuery: string): QueryPlan {
  return {
    rawQuery,
    normalizedQuery,
    matchedRuleId: null,
    categorySlug: null,
    serviceCategorySlug: null,
    requiredTags: [],
    anyTags: [],
    townSlug: null,
    scope: "anywhere",
    searchTerms: [],
    priceLevel: null,
    vibeTags: [],
  };
}

export function explicitFiltersToPartialPlan(opts: ExplicitV2Filters): Partial<QueryPlan> {
  const out: Partial<QueryPlan> = {};
  if (opts.townSlug != null)            out.townSlug = opts.townSlug;
  if (opts.categorySlug != null)        out.categorySlug = opts.categorySlug;
  if (opts.serviceCategorySlug != null) out.serviceCategorySlug = opts.serviceCategorySlug;
  if (opts.priceLevel != null)          out.priceLevel = opts.priceLevel;
  if (opts.vibeTags?.length)            out.vibeTags = opts.vibeTags;
  if (opts.scope != null)               out.scope = opts.scope;
  return out;
}
