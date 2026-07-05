import tagAliasesData from "@/data/search-tag-aliases.json";
import {
  detectQueryThemes,
  detectTreatPreference,
  type AskQueryThemes,
} from "@/lib/ask/search-input";
import { normalizeAskVibeTags } from "@/lib/ask/search-input";
import { normalizeSearchTagSlug } from "@/lib/discovery-filters/search-tag-label";
import { getStaticSearchTagVocabulary } from "@/lib/discovery-filters/search-tag-vocabulary";
import { normalizeQuery } from "@/lib/query-normalize";
import type { QueryPlan } from "@/lib/search/query-plan-v2";

export type TagAliasEntry = {
  match: string;
  tags?: string[];
  categorySlug?: string;
};

export type ResolvedQueryTags = {
  tags: string[];
  categorySlug?: string;
  /** Tokens/phrases the user likely meant as a tag filter but could not resolve. */
  unresolvedTerms: string[];
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

const VIBE_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\bkid|kids|child|children|family\b/, "kid_friendly"],
  [/\bdog|dogs|pet\b/, "pet_friendly"],
  [/\bromantic\b/, "romantic"],
  [/\bwaterfront\b/, "waterfront"],
  [/\blive music\b/, "live_music"],
  [/\bhappy hour\b/, "happy_hour"],
];

const TREAT_CATEGORY: Record<
  NonNullable<ReturnType<typeof detectTreatPreference>>,
  string
> = {
  ice_cream: "ice_cream",
  donut: "donut_shops",
  bakery: "desserts",
  coffee_sweet: "coffee_shops",
};

const THEME_CATEGORY: Partial<Record<keyof AskQueryThemes, string>> = {
  coffee: "coffee_shops",
  iceCream: "ice_cream",
  donuts: "donut_shops",
  bakery: "desserts",
  dining: "restaurants",
  bars: "bars",
  shopping: "shopping",
  activities: "activities",
};

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
  "and",
  "with",
  "for",
  "my",
  "me",
  "us",
  "we",
  "find",
  "looking",
  "place",
  "places",
  "spot",
  "spots",
  "shop",
  "shops",
  "store",
  "stores",
  "restaurant",
  "restaurants",
  "bar",
  "bars",
  "food",
  "eat",
  "eating",
  "dining",
  "something",
  "good",
  "best",
  "nice",
]);

const ALIAS_ENTRIES: TagAliasEntry[] = (
  (tagAliasesData as { entries: TagAliasEntry[] }).entries ?? []
)
  .map((entry) => ({ ...entry, match: entry.match.toLowerCase().trim() }))
  .filter((entry) => entry.match.length > 0)
  .sort((a, b) => b.match.length - a.match.length);

function dedupeStrings(items: string[]): string[] {
  return [...new Set(items)];
}

function extractPatternTags(normalized: string): string[] {
  const vibeRaw: string[] = [];
  for (const [re, tag] of VIBE_PATTERNS) {
    if (re.test(normalized)) vibeRaw.push(tag);
  }
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

function matchAliasEntries(normalized: string): {
  tags: string[];
  categorySlug?: string;
  matchedPhrases: string[];
} {
  const tags: string[] = [];
  let categorySlug: string | undefined;
  const matchedPhrases: string[] = [];

  for (const entry of ALIAS_ENTRIES) {
    if (!normalized.includes(entry.match)) continue;
    matchedPhrases.push(entry.match);
    if (entry.tags?.length) tags.push(...entry.tags);
    if (entry.categorySlug && !categorySlug) categorySlug = entry.categorySlug;
  }

  return {
    tags: dedupeStrings(tags),
    categorySlug,
    matchedPhrases,
  };
}

function categoryFromThemes(themes: AskQueryThemes, treat: ReturnType<typeof detectTreatPreference>): string | undefined {
  if (treat) return TREAT_CATEGORY[treat];
  for (const [key, slug] of Object.entries(THEME_CATEGORY) as [keyof AskQueryThemes, string][]) {
    if (themes[key]) return slug;
  }
  return undefined;
}

function vocabularySlugForToken(token: string, vocabulary: ReadonlySet<string>): string | null {
  const slug = normalizeSearchTagSlug(token);
  if (!slug) return null;
  if (vocabulary.has(slug)) return slug;

  const underscored = token.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (vocabulary.has(underscored)) return underscored;

  for (const vocabSlug of vocabulary) {
    if (vocabSlug.replace(/_/g, "") === underscored.replace(/_/g, "")) return vocabSlug;
  }

  return null;
}

function tokensFromNormalized(normalized: string): string[] {
  return normalized.split(/\s+/).filter(Boolean);
}

function stripMatchedPhrases(normalized: string, phrases: string[]): string {
  let out = normalized;
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    out = out.replaceAll(phrase, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

function stripTownTokens(tokens: string[], townSlug: string | null): string[] {
  if (!townSlug) return tokens;
  const townTokens = new Set(townSlug.replace(/-/g, " ").split(/\s+/).filter(Boolean));
  return tokens.filter((token) => !townTokens.has(token));
}

/**
 * Resolve search_tags slugs and optional category hints from NL query text.
 * Uses rules plan tags, regex heuristics, curated aliases, Ask theme detection, and vocabulary lookup.
 */
export function resolveQueryTags(
  rawQuery: string,
  plan: QueryPlan,
  options?: {
    vocabulary?: ReadonlySet<string>;
    townSlug?: string | null;
  },
): ResolvedQueryTags {
  const normalized = normalizeQuery(rawQuery);
  const vocabulary = options?.vocabulary ?? getStaticSearchTagVocabulary();
  const townSlug = options?.townSlug ?? plan.townSlug ?? null;

  const ruleTags = dedupeStrings([
    ...plan.requiredTags,
    ...plan.anyTags,
    ...(plan.vibeTags ?? []),
  ]);
  const patternTags = extractPatternTags(normalized);
  const aliasMatch = matchAliasEntries(normalized);
  const themes = detectQueryThemes(rawQuery);
  const treat = detectTreatPreference(rawQuery);
  const themeCategory = categoryFromThemes(themes, treat);

  const tags = dedupeStrings([
    ...ruleTags,
    ...patternTags,
    ...aliasMatch.tags,
  ]).filter((tag) => vocabulary.has(tag));

  const categorySlug = plan.categorySlug ?? aliasMatch.categorySlug ?? themeCategory;

  const matchedPhrases = [
    ...aliasMatch.matchedPhrases,
    ...ruleTags,
    ...patternTags,
    ...(categorySlug ? [categorySlug.replace(/_/g, " ")] : []),
  ];

  let residual = stripMatchedPhrases(normalized, matchedPhrases);
  if (plan.searchTerms.length > 0) {
    residual = stripMatchedPhrases(residual, plan.searchTerms);
  }

  let residualTokens = tokensFromNormalized(residual);
  residualTokens = stripTownTokens(residualTokens, townSlug);
  residualTokens = residualTokens.filter((token) => !RESIDUAL_STOP_WORDS.has(token));

  const unresolvedTerms: string[] = [];
  for (const token of residualTokens) {
    if (token.length < 3) continue;
    const slug = vocabularySlugForToken(token, vocabulary);
    if (slug) {
      if (!tags.includes(slug)) tags.push(slug);
      continue;
    }
    unresolvedTerms.push(token);
  }

  return {
    tags: dedupeStrings(tags),
    categorySlug,
    unresolvedTerms: dedupeStrings(unresolvedTerms),
  };
}
