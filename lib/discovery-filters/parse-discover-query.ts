import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";
import { resolveQueryTags } from "@/lib/discovery-filters/resolve-query-tags";
import { hasCuisineProductTags } from "@/lib/discovery-filters/cuisine-product-tags";
import { normalizeQuery } from "@/lib/query-normalize";
import { normalizeServiceCategorySlug } from "@/lib/service-categories/normalize";
import { resolveQueryPlan } from "@/lib/search/resolve-query-plan";

export type ParsedDiscoverQuery = {
  type?: "storefront" | "services";
  town?: string;
  /** `near` expands to a corridor zone; `exact` keeps the named town only. */
  town_scope?: "exact" | "near";
  category?: string;
  service_category?: string;
  facet?: string;
  q?: string;
  /** Terms the user likely meant as a tag but could not resolve to vocabulary. */
  unresolvedTerms?: string[];
  /** How this parse was produced (server hybrid path only). */
  resolver?: "deterministic" | "llm" | "hybrid";
  /** Signals for server LLM gating — not used in URL building. */
  deterministicSignals?: DeterministicParseSignals;
  /** True when parsing extracted structured filters beyond a raw `q` pass-through. */
  expanded: boolean;
};

/** Metadata from the deterministic pass — used to decide LLM fallback. */
export type DeterministicParseSignals = {
  matchedRuleId?: string;
  hasResidualQ: boolean;
  usedHeuristicCategory: boolean;
  usedAliasOrThemeCategory: boolean;
};

const FOOD_CONTEXT_RE =
  /\b(lunch|dinner|breakfast|brunch|restaurant|restaurants|eat|food|dining)\b/;

const SERVICE_HINT_RE =
  /\b(plumber|plumbing|hvac|electrician|cleaning|landscap|pest control|photographer|contractor|handyman|services?|vendor)\b/i;

const RESIDUAL_STOP_WORDS = new Set([
  "near",
  "in",
  "around",
  "close",
  "to",
  "the",
  "a",
  "an",
  "on",
  "30a",
  "kid",
  "kids",
  "friendly",
  "child",
  "children",
  "family",
  "and",
  "or",
  "with",
]);

export type ParseDiscoverQueryOptions = {
  /** Full tag vocabulary (server). Defaults to static subset when omitted. */
  vocabulary?: ReadonlySet<string>;
};

function resolveCategoryFromPlan(plan: ReturnType<typeof resolveQueryPlan>): {
  type?: "storefront" | "services";
  category?: string;
  service_category?: string;
} {
  if (plan.serviceCategorySlug) {
    const rollup = normalizeServiceCategoryGroupSlug(plan.serviceCategorySlug);
    if (rollup) return { type: "services", service_category: rollup };
  }

  if (plan.categorySlug) {
    const storefrontRollup = normalizeStorefrontCategoryGroupSlug(plan.categorySlug);
    if (storefrontRollup) {
      return { type: "storefront", category: storefrontRollup };
    }

    const granularService = normalizeServiceCategorySlug(plan.categorySlug);
    if (granularService) {
      const serviceRollup = normalizeServiceCategoryGroupSlug(granularService);
      if (serviceRollup) return { type: "services", service_category: serviceRollup };
    }
  }

  return {};
}

function buildResidualQuery(
  normalized: string,
  plan: ReturnType<typeof resolveQueryPlan>,
  townSlugs: string[],
  resolvedTags: string[],
  hasCategoryRollup: boolean,
): string | undefined {
  if (plan.matchedRuleId && hasCategoryRollup) {
    return undefined;
  }

  let terms =
    plan.searchTerms.length > 0
      ? [...plan.searchTerms]
      : normalized.split(/\s+/).filter(Boolean);

  if (townSlugs.length) {
    const townTokens = new Set<string>();
    for (const slug of townSlugs) {
      for (const token of slug.replace(/-/g, " ").split(/\s+/).filter(Boolean)) {
        townTokens.add(token);
      }
    }
    terms = terms.filter((token) => !townTokens.has(token));
  }

  terms = terms.filter((token) => !RESIDUAL_STOP_WORDS.has(token));

  for (const tag of resolvedTags) {
    for (const token of tag.replace(/_/g, " ").split(/\s+/)) {
      terms = terms.filter((t) => t !== token);
    }
  }

  const joined = terms.join(" ").trim();
  return joined || undefined;
}

/** True when URL already carries explicit discover filters (skip NL expansion). */
export function hasExplicitDiscoverParams(params: {
  type?: string | null;
  town?: string | null;
  town_id?: string | null;
  category?: string | null;
  service_category?: string | null;
  facet?: string | null;
  facet_any?: string | null;
  area_id?: string | null;
}): boolean {
  return Boolean(
    params.type?.trim() ||
      params.town?.trim() ||
      params.town_id?.trim() ||
      params.category?.trim() ||
      params.service_category?.trim() ||
      params.facet?.trim() ||
      params.facet_any?.trim() ||
      params.area_id?.trim(),
  );
}

/**
 * Map a natural-language query to discover URL params using deterministic rules,
 * town extraction, curated tag aliases, theme detection, and vocabulary lookup.
 */
export function parseDiscoverQuery(
  rawQuery: string,
  options?: ParseDiscoverQueryOptions,
): ParsedDiscoverQuery {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { expanded: false };

  const plan = resolveQueryPlan(trimmed);
  const normalized = normalizeQuery(trimmed);
  const categoryFields = resolveCategoryFromPlan(plan);
  let usedHeuristicCategory = false;
  let usedAliasOrThemeCategory = false;

  const tagResolution = resolveQueryTags(trimmed, plan, {
    vocabulary: options?.vocabulary,
    townSlugs: plan.townSlugs,
  });

  if (
    !categoryFields.category &&
    !categoryFields.service_category &&
    tagResolution.categorySlug
  ) {
    usedAliasOrThemeCategory = true;
    const rollup = normalizeStorefrontCategoryGroupSlug(tagResolution.categorySlug);
    if (rollup) {
      categoryFields.type = "storefront";
      categoryFields.category = rollup;
    }
  }

  if (
    !categoryFields.category &&
    !categoryFields.service_category &&
    FOOD_CONTEXT_RE.test(normalized)
  ) {
    usedHeuristicCategory = true;
    categoryFields.type = "storefront";
    categoryFields.category = "restaurants_and_bars";
  }

  if (
    !categoryFields.category &&
    !categoryFields.service_category &&
    SERVICE_HINT_RE.test(normalized)
  ) {
    usedHeuristicCategory = true;
    categoryFields.type = "services";
  }

  const allTags = tagResolution.tags;

  if (
    !categoryFields.category &&
    !categoryFields.service_category &&
    !categoryFields.type &&
    hasCuisineProductTags(allTags)
  ) {
    categoryFields.type = "storefront";
  }

  const townSlugs = plan.townSlugs;
  const town = townSlugs.length ? townSlugs.join(",") : undefined;
  const town_scope =
    !town
      ? undefined
      : townSlugs.length > 1 || plan.scope === "exact"
        ? "exact"
        : "near";
  const hasCategoryRollup = Boolean(
    categoryFields.category || categoryFields.service_category,
  );
  const q = buildResidualQuery(
    normalized,
    plan,
    townSlugs,
    allTags,
    hasCategoryRollup,
  );

  const deterministicSignals: DeterministicParseSignals = {
    matchedRuleId: plan.matchedRuleId ?? undefined,
    hasResidualQ: Boolean(q?.trim()),
    usedHeuristicCategory,
    usedAliasOrThemeCategory,
  };

  const expanded = Boolean(
    town ||
      categoryFields.category ||
      categoryFields.service_category ||
      allTags.length > 0 ||
      categoryFields.type,
  );

  if (!expanded) {
    return {
      q: trimmed,
      unresolvedTerms: tagResolution.unresolvedTerms.length
        ? tagResolution.unresolvedTerms
        : [trimmed.toLowerCase()],
      deterministicSignals,
      expanded: false,
    };
  }

  return {
    type: categoryFields.type,
    town,
    town_scope,
    category: categoryFields.category,
    service_category: categoryFields.service_category,
    facet: allTags.length ? allTags.join(",") : undefined,
    q,
    unresolvedTerms: tagResolution.unresolvedTerms.length
      ? tagResolution.unresolvedTerms
      : undefined,
    deterministicSignals,
    expanded: true,
  };
}
