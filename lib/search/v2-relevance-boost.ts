import type { QueryPlan } from "@/lib/search/query-plan-v2";

const CAP = 0.14;
const TAG_MATCH = 0.028;
const TITLE_MATCH = 0.018;
const PHRASE_TAG_MATCH = 0.04;
const RULE_BOOST = 0.055;
const STRONG_RULE_BOOST = 0.085;
const GIRLS_TRIP_BOOST = 0.115;

/** Multi-word cues that map to search_tags / business_type (not routing rules). */
const PHRASE_CUES = [
  "ice cream",
  "wine bar",
  "live music",
  "girls trip",
  "sunset",
  "waterfront",
  "remote work",
  "laptop",
  "wifi",
  "boutique",
  "cocktails",
  "gulf views",
  "shaved ice",
  "jewelry",
  "footwear",
  "sandals",
] as const;

const ICE_CREAM_TYPES = ["ice cream", "shaved ice", "frozen"];

const REMOTE_WORK_HINTS = ["wifi", "remote work", "laptop", "cozy", "quiet", "locals_favorite"];

const FITNESS_TYPES = /pilates|yoga studio|fitness|gym/i;

type BoostRow = {
  title?: string | null;
  search_tags?: string[] | null;
  business_type?: string | null;
};

function tagHits(tags: string[], needles: string[]): number {
  return needles.filter((needle) =>
    tags.some(
      (tag) =>
        tag.includes(needle.replace(/ /g, "_")) ||
        tag.includes(needle) ||
        (needle.length >= 4 && tag.includes(needle.slice(0, -1))),
    ),
  ).length;
}

function locationTitleBoost(title: string, q: string): number {
  const cues = ["seaside", "watercolor", "watercolour", "rosemary", "grayton", "alys beach", "inlet beach"];
  for (const cue of cues) {
    if (q.includes(cue) && title.includes(cue)) return 0.05;
  }
  return 0;
}

function ruleSpecificBoost(
  row: BoostRow,
  rawQuery: string,
  plan: QueryPlan,
  tags: string[],
  bizType: string,
  title: string,
): number {
  const q = rawQuery.toLowerCase();

  if (plan.matchedRuleId === "category_remote_work") {
    const hits = tagHits(tags, REMOTE_WORK_HINTS);
    if (hits >= 3) return STRONG_RULE_BOOST;
    if (hits >= 2) return RULE_BOOST + 0.03;
    if (hits >= 1) return RULE_BOOST;
  }

  if (plan.matchedRuleId === "category_ice_cream") {
    const isIceCream =
      ICE_CREAM_TYPES.some((t) => bizType.includes(t)) ||
      tags.some((tag) => tag.includes("ice cream") || tag.includes("shaved ice"));
    if (isIceCream) {
      return STRONG_RULE_BOOST;
    }
  }

  if (plan.matchedRuleId === "category_footwear") {
    if (
      bizType.includes("shoe") ||
      tags.some((tag) => tag.includes("shoe") || tag.includes("sandal") || tag.includes("footwear"))
    ) {
      return STRONG_RULE_BOOST;
    }
  }

  if (plan.matchedRuleId === "category_jewelry") {
    if (bizType.includes("jewelry") || tags.some((tag) => tag.includes("jewelry"))) {
      return STRONG_RULE_BOOST;
    }
  }

  if (plan.matchedRuleId === "category_fitness") {
    if (/pilates|fitness center|fitness gym|fitness studio/i.test(bizType) && !/apparel|clothing|wear/i.test(bizType)) {
      return STRONG_RULE_BOOST + 0.045;
    }
    if (FITNESS_TYPES.test(bizType) && !/apparel|clothing|wear/i.test(bizType)) {
      return RULE_BOOST;
    }
    if (/apparel|clothing|wear/i.test(bizType)) {
      return -0.05;
    }
  }

  if (plan.matchedRuleId === "category_shopping_boutiques" && q.includes("girls trip")) {
    const hasGirlsTrip = tags.some((tag) => tag.includes("girls_trip") || tag.includes("girls trip"));
    const hasUpscale = tags.some((tag) => tag.includes("upscale"));
    if (hasGirlsTrip && hasUpscale) return GIRLS_TRIP_BOOST + 0.055;
    if (hasGirlsTrip) return RULE_BOOST * 0.5;
  }

  if (plan.matchedRuleId === "category_coffee") {
    if ((q.includes("seaside") || q.includes("watercolor") || q.includes("watercolour")) && title.includes("amavida")) {
      return RULE_BOOST + 0.025;
    }
  }

  return 0;
}

/**
 * Light post-rank boost when listing tags/titles align with the query.
 * Routing rules narrow the corpus; this breaks ties without hardcoding winners.
 */
export function computeV2RelevanceBoost(
  row: BoostRow,
  rawQuery: string,
  plan: QueryPlan,
): number {
  const q = rawQuery.toLowerCase();
  const tags = (row.search_tags ?? []).map((t) => t.toLowerCase());
  const title = (row.title ?? "").toLowerCase();
  const bizType = (row.business_type ?? "").toLowerCase();

  if (!tags.length && !title) return 0;

  let boost = 0;

  const tokens = [...new Set(q.split(/\s+/).filter((w) => w.length >= 3))];
  for (const token of tokens) {
    if (tags.some((tag) => tag.includes(token))) boost += TAG_MATCH;
    if (title.includes(token) || bizType.includes(token)) boost += TITLE_MATCH;
  }

  for (const term of plan.searchTerms) {
    const t = term.toLowerCase();
    if (tags.some((tag) => tag.includes(t) || t.includes(tag))) boost += TAG_MATCH;
    if (bizType.includes(t)) boost += TITLE_MATCH;
  }

  for (const phrase of PHRASE_CUES) {
    if (!q.includes(phrase)) continue;
    if (tags.some((tag) => tag.includes(phrase))) boost += PHRASE_TAG_MATCH;
    if (title.includes(phrase) || bizType.includes(phrase)) boost += TITLE_MATCH;
  }

  boost += locationTitleBoost(title, q);
  boost += ruleSpecificBoost(row, rawQuery, plan, tags, bizType, title);

  if (plan.matchedRuleId === "category_shopping_boutiques" && q.includes("girls trip")) {
    const hasGirlsTrip = tags.some((tag) => tag.includes("girls_trip") || tag.includes("girls trip"));
    const hasUpscale = tags.some((tag) => tag.includes("upscale"));
    if (hasGirlsTrip && hasUpscale) boost = Math.max(boost, 0.25);
    else if (hasGirlsTrip) boost = Math.min(boost, 0.05);
  }

  return Math.min(Math.max(boost, -0.05), CAP);
}
