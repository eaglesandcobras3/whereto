import { normalizeAskVibeTags } from "@/lib/ask/search-input";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";
import { normalizeQuery } from "@/lib/query-normalize";
import { normalizeServiceCategorySlug } from "@/lib/service-categories/normalize";
import { resolveQueryPlan } from "@/lib/search/resolve-query-plan";

export type ParsedDiscoverQuery = {
  type?: "storefront" | "services";
  town?: string;
  category?: string;
  service_category?: string;
  facet?: string;
  q?: string;
  /** True when parsing extracted structured filters beyond a raw `q` pass-through. */
  expanded: boolean;
};

const DIETARY_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\bgluten[- ]?free\b/, "gluten_free"],
  [/\bvegan\b/, "vegan"],
  [/\bvegetarian\b/, "vegetarian"],
  [/\bdairy[- ]?free\b/, "dairy_free"],
];

const MEAL_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\bbreakfast\b/, "breakfast"],
  [/\bbrunch\b/, "brunch"],
  [/\blunch\b/, "lunch"],
  [/\bdinner\b/, "dinner"],
  [/\blate[- ]?night\b/, "late_night"],
];

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
  "with",
]);

function dedupeStrings(items: string[]): string[] {
  return [...new Set(items)];
}

function extractTagsFromNormalized(normalized: string): string[] {
  const vibeRaw: string[] = [];
  if (/\bkid|kids|child|children|family\b/.test(normalized)) vibeRaw.push("kid_friendly");
  if (/\bdog|dogs|pet\b/.test(normalized)) vibeRaw.push("pet_friendly");
  if (/\bromantic\b/.test(normalized)) vibeRaw.push("romantic");
  if (/\bwaterfront\b/.test(normalized)) vibeRaw.push("waterfront");
  if (/\blive music\b/.test(normalized)) vibeRaw.push("live_music");
  if (/\bhappy hour\b/.test(normalized)) vibeRaw.push("happy_hour");

  const fromVibe = normalizeAskVibeTags(vibeRaw) ?? [];
  const direct: string[] = [];
  for (const [re, tag] of DIETARY_PATTERNS) {
    if (re.test(normalized)) direct.push(tag);
  }
  for (const [re, tag] of MEAL_PATTERNS) {
    if (re.test(normalized)) direct.push(tag);
  }

  return dedupeStrings([...fromVibe, ...direct]);
}

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
  townSlug: string | null,
): string | undefined {
  let terms =
    plan.searchTerms.length > 0
      ? [...plan.searchTerms]
      : normalized.split(/\s+/).filter(Boolean);

  if (townSlug) {
    const townTokens = new Set(townSlug.replace(/-/g, " ").split(/\s+/).filter(Boolean));
    terms = terms.filter((token) => !townTokens.has(token));
  }

  terms = terms.filter((token) => !RESIDUAL_STOP_WORDS.has(token));

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
 * town extraction, and vibe/dietary/meal tag heuristics.
 */
export function parseDiscoverQuery(rawQuery: string): ParsedDiscoverQuery {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { expanded: false };

  const plan = resolveQueryPlan(trimmed);
  const normalized = normalizeQuery(trimmed);
  const categoryFields = resolveCategoryFromPlan(plan);

  if (
    !categoryFields.category &&
    !categoryFields.service_category &&
    FOOD_CONTEXT_RE.test(normalized)
  ) {
    categoryFields.type = "storefront";
    categoryFields.category = "restaurants_and_bars";
  }

  if (
    !categoryFields.category &&
    !categoryFields.service_category &&
    SERVICE_HINT_RE.test(normalized)
  ) {
    categoryFields.type = "services";
  }

  const ruleTags = dedupeStrings([
    ...plan.requiredTags,
    ...plan.anyTags,
    ...(plan.vibeTags ?? []),
  ]);
  const textTags = extractTagsFromNormalized(normalized);
  const allTags = dedupeStrings([...ruleTags, ...textTags]);

  const town = plan.townSlug ?? undefined;
  const q = buildResidualQuery(normalized, plan, plan.townSlug);

  const expanded = Boolean(
    town ||
      categoryFields.category ||
      categoryFields.service_category ||
      allTags.length > 0 ||
      categoryFields.type,
  );

  if (!expanded) {
    return { q: trimmed, expanded: false };
  }

  return {
    type: categoryFields.type,
    town,
    category: categoryFields.category,
    service_category: categoryFields.service_category,
    facet: allTags.length ? allTags.join(",") : undefined,
    q,
    expanded: true,
  };
}
