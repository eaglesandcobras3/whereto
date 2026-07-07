import rulesData from "@/data/search-query-rules.json";
import { normalizeQuery, emptyQueryPlan, explicitFiltersToPartialPlan } from "@/lib/search/query-plan-v2";
import type { QueryPlan, ExplicitV2Filters } from "@/lib/search/query-plan-v2";
import { extractTownsFromNormalizedQuery } from "@/lib/ai/town-query-aliases";

type RulePlan = {
  categorySlug?: string;
  serviceCategorySlug?: string;
  requiredTags?: string[];
  anyTags?: string[];
  searchTerms?: string[];
  townSlug?: string;
};

type SearchQueryRule = {
  id: string;
  problemClass: string;
  description?: string;
  phrases: string[];
  priority: number;
  plan: RulePlan;
};

// Pre-compute: flatten (phrase, rule) pairs sorted by phrase.length DESC, then priority DESC.
// Longest phrase wins so "golf carts" beats "golf" even if "golf" has higher priority.
type PhrasePair = { phrase: string; rule: SearchQueryRule };

const PHRASE_PAIRS: PhrasePair[] = (rulesData.rules as SearchQueryRule[])
  .flatMap(rule => rule.phrases.map(phrase => ({ phrase: phrase.toLowerCase(), rule })))
  .sort((a, b) =>
    b.phrase.length - a.phrase.length ||
    b.rule.priority - a.rule.priority
  );

/**
 * Find the highest-priority rule whose phrase matches the normalized query.
 * Longest phrase wins (substring match on full word boundaries is not enforced —
 * the rules file authors are responsible for non-ambiguous phrase lists).
 */
function findMatchingRule(normalizedQuery: string): SearchQueryRule | null {
  for (const { phrase, rule } of PHRASE_PAIRS) {
    if (normalizedQuery.includes(phrase)) return rule;
  }
  return null;
}

/** "near X" / "nearby X" / "around X" / "close to X" => include adjacent towns. */
const NEAR_PREPOSITION_RE = /\b(near|nearby|around|close to)\b/;
/** "in X" => that town only, no adjacent towns. */
const IN_PREPOSITION_RE = /\bin\b/;

/**
 * Deterministic free-text town extraction — no rule or OpenAI call required.
 * Reuses the canonical town alias list from the V1 keyword fast path so the
 * two pipelines can't drift on what counts as a town mention.
 */
function extractTownScope(
  normalizedQuery: string,
): { townSlugs: string[]; scope: "exact" | "near" } | null {
  const townSlugs = extractTownsFromNormalizedQuery(normalizedQuery);
  if (!townSlugs.length) return null;
  const scope = NEAR_PREPOSITION_RE.test(normalizedQuery)
    ? "near"
    : IN_PREPOSITION_RE.test(normalizedQuery)
      ? "exact"
      : "near";
  return { townSlugs, scope };
}

function applyExtractedTowns(
  merged: QueryPlan,
  extractedTown: { townSlugs: string[]; scope: "exact" | "near" },
): void {
  merged.townSlugs = extractedTown.townSlugs;
  merged.townSlug = extractedTown.townSlugs[0] ?? null;
  merged.scope =
    extractedTown.townSlugs.length > 1 ? "exact" : extractedTown.scope;
}

function mergePlanLayers(
  base: QueryPlan,
  rulePlan: RulePlan | null,
  extractedTown: { townSlugs: string[]; scope: "exact" | "near" } | null,
  explicit: Partial<QueryPlan>,
): QueryPlan {
  const merged: QueryPlan = { ...base };

  if (rulePlan) {
    if (rulePlan.categorySlug        != null) merged.categorySlug        = rulePlan.categorySlug;
    if (rulePlan.serviceCategorySlug != null) merged.serviceCategorySlug = rulePlan.serviceCategorySlug;
    if (rulePlan.requiredTags?.length)        merged.requiredTags         = rulePlan.requiredTags;
    if (rulePlan.anyTags?.length)             merged.anyTags              = rulePlan.anyTags;
    if (rulePlan.searchTerms?.length)         merged.searchTerms          = rulePlan.searchTerms;
    if (rulePlan.townSlug            != null) merged.townSlug             = rulePlan.townSlug;
  }

  // Free-text town mention fills townSlug/scope when no rule already set one.
  if (extractedTown && merged.townSlug == null) {
    applyExtractedTowns(merged, extractedTown);
  }

  // Explicit UI filters always win over rule-derived and extracted fields.
  if (explicit.categorySlug        != null) merged.categorySlug        = explicit.categorySlug;
  if (explicit.serviceCategorySlug != null) merged.serviceCategorySlug = explicit.serviceCategorySlug;
  if (explicit.townSlug            != null) {
    merged.townSlug = explicit.townSlug;
    merged.townSlugs = [explicit.townSlug];
  }
  if (explicit.priceLevel          != null) merged.priceLevel          = explicit.priceLevel;
  if (explicit.vibeTags?.length)            merged.vibeTags            = explicit.vibeTags;
  if (explicit.scope               != null) merged.scope               = explicit.scope;
  if (explicit.requiredTags?.length)        merged.requiredTags        = explicit.requiredTags;
  if (explicit.anyTags?.length)             merged.anyTags             = explicit.anyTags;
  if (explicit.searchTerms?.length)         merged.searchTerms         = explicit.searchTerms;

  return merged;
}

/**
 * Resolve a QueryPlan from a raw query string and optional explicit UI filters.
 *
 * Layer order (later overrides earlier):
 *   1. Empty base plan
 *   2. Matched rule from data/search-query-rules.json (deterministic routing)
 *   3. Explicit caller overrides (UI filters, sidebar selections)
 *
 * When no rule matches, searchTerms defaults to the normalized query tokens so
 * the V2 RPC still runs FTS+vector retrieval on the full corpus.
 */
export function resolveQueryPlan(
  rawQuery: string,
  explicitFilters: ExplicitV2Filters = {},
): QueryPlan {
  const normalized = normalizeQuery(rawQuery);
  const base       = emptyQueryPlan(rawQuery, normalized);

  const matchedRule = findMatchingRule(normalized);
  if (matchedRule) {
    base.matchedRuleId = matchedRule.id;
  }

  // When no rule matches, fall through to full FTS+vector on the raw tokens.
  const rulePlan = matchedRule?.plan ?? null;
  const fallbackSearchTerms = rulePlan ? [] : normalized.split(/\s+/).filter(Boolean);

  const extractedTown = extractTownScope(normalized);
  const explicit = explicitFiltersToPartialPlan(explicitFilters);

  const plan = mergePlanLayers(base, rulePlan, extractedTown, explicit);

  if (plan.searchTerms.length === 0) {
    plan.searchTerms = fallbackSearchTerms;
  }

  return plan;
}
