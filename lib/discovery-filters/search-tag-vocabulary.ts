import rulesData from "@/data/search-query-rules.json";
import tagAliasesData from "@/data/search-tag-aliases.json";

/** Vibe / facet slugs used across Ask and Discover NL parsing. */
export const CORE_SEARCH_TAG_SLUGS = [
  "romantic",
  "kid_friendly",
  "group_friendly",
  "date_night",
  "solo_friendly",
  "waterfront",
  "beachfront",
  "outdoor_seating",
  "scenic_views",
  "upscale",
  "casual",
  "local_favorite",
  "hidden_gem",
  "instagrammable",
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "quick_bite",
  "late_night",
  "happy_hour",
  "live_music",
  "pet_friendly",
  "parking",
  "walkable",
  "free_entry",
  "gluten_free",
  "vegan",
  "vegetarian",
  "dairy_free",
  "coffee",
  "golf",
  "books",
  "mobility_rental",
  "sushi",
  "mexican",
  "pizza",
  "seafood",
  "bbq",
] as const;

type RulePlan = {
  requiredTags?: string[];
  anyTags?: string[];
};

type SearchQueryRule = {
  plan: RulePlan;
};

function tagsFromRules(): string[] {
  const rules = rulesData.rules as SearchQueryRule[];
  return rules.flatMap((rule) => [
    ...(rule.plan.requiredTags ?? []),
    ...(rule.plan.anyTags ?? []),
  ]);
}

function tagsFromAliases(): string[] {
  const entries = (tagAliasesData as { entries: Array<{ tags?: string[] }> }).entries;
  return entries.flatMap((entry) => entry.tags ?? []);
}

/** Static tag slug set for client-safe NL resolution (subset of DB vocabulary). */
export function getStaticSearchTagVocabulary(): ReadonlySet<string> {
  const slugs = new Set<string>([...CORE_SEARCH_TAG_SLUGS, ...tagsFromRules(), ...tagsFromAliases()]);
  return slugs;
}
