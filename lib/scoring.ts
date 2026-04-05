import type { SearchIntent } from "@/lib/intent-schema";
import { getCompositeWeights } from "@/lib/scoring-weights";

export type BusinessForScore = {
  id: string;
  town_id: number | null;
  category_id: number | null;
  status: string;
  suspected_closed: boolean;
  admin_suppressed: boolean;
  confidence_score: number;
  freshness_score: number;
  engagement_score: number;
  exploration_score: number;
  completeness_score: number;
  bad_experience_unique_users: number;
  google_rating: number | null;
  google_review_count: number | null;
};

export type BusinessRowWithTags = BusinessForScore & {
  slug?: string;
  tag_slugs: string[];
  name?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  phone?: string | null;
  website?: string | null;
  price_level?: number | null;
  ai_summary?: string | null;
  /** Google Places photo resource names; proxied for display. */
  google_photos?: string[] | null;
};

/** Optional anchor town for SEO/town hubs (TDD-SEO-TOWNS §7). */
export type LocationRankingScope = {
  anchorTownId: number;
  adjacentTownIds: Set<number>;
  /** Towns in same region (excluding anchor); used for 0.70 tier. */
  regionTownIds: Set<number>;
};

/**
 * Relevance multiplier vs anchor town: same 1.0, adjacent 0.85, same region 0.70, else 0.45.
 * When scope is null (default AI search), returns 1.
 */
export function locationProximityMultiplier(
  businessTownId: number | null,
  scope: LocationRankingScope | null,
): number {
  if (!scope) return 1;
  if (businessTownId == null) return 0.5;
  if (businessTownId === scope.anchorTownId) return 1;
  if (scope.adjacentTownIds.has(businessTownId)) return 0.85;
  if (scope.regionTownIds.has(businessTownId)) return 0.7;
  return 0.45;
}

export function passesEligibility(
  b: BusinessForScore,
  suppressedIds: Set<string>,
): boolean {
  if (b.status !== "active") return false;
  if (b.suspected_closed) return false;
  if (b.admin_suppressed) return false;
  if (b.confidence_score < 0.35) return false;
  if (b.freshness_score < 0.2) return false;
  if (suppressedIds.has(b.id)) return false;
  if (b.bad_experience_unique_users >= 3 && b.confidence_score < 0.5) {
    return false;
  }
  return true;
}

function relevanceForIntent(
  intent: SearchIntent,
  b: BusinessForScore,
  tagSlugs: Set<string>,
  townSlugToId: Map<string, number>,
  categorySlugToId: Map<string, number>,
): number {
  let score = 0.1;
  if (intent.category) {
    const cid = categorySlugToId.get(intent.category);
    if (cid != null && b.category_id === cid) score += 0.45;
  }
  if (intent.location.town) {
    const tid = townSlugToId.get(intent.location.town);
    if (tid != null && b.town_id === tid) score += 0.35;
  }
  for (const attr of intent.attributes) {
    if (tagSlugs.has(attr)) score += 0.06;
  }
  return Math.min(1, score);
}

function compositeScore(
  rel: number,
  b: BusinessForScore,
): number {
  const w = getCompositeWeights();
  return (
    w.relevance * rel +
    w.confidence * b.confidence_score +
    w.freshness * b.freshness_score +
    w.engagement * b.engagement_score +
    w.completeness * b.completeness_score +
    b.exploration_score +
    ((b.google_rating ?? 0) / 5) * w.ratingTiebreak
  );
}

/** Eligibility + weighted composite + light category diversity (Section 11 intent). */
export function scoreAndRankCandidates(
  rows: BusinessRowWithTags[],
  intent: SearchIntent,
  townSlugToId: Map<string, number>,
  categorySlugToId: Map<string, number>,
  suppressedIds: Set<string>,
  limit = 15,
  locationScope: LocationRankingScope | null = null,
): BusinessRowWithTags[] {
  const ranked = rows
    .filter((row) => passesEligibility(row, suppressedIds))
    .map((row) => {
      const { tag_slugs, ...b } = row;
      let rel = relevanceForIntent(
        intent,
        b,
        new Set(tag_slugs),
        townSlugToId,
        categorySlugToId,
      );
      rel *= locationProximityMultiplier(b.town_id ?? null, locationScope);
      rel = Math.min(1, rel);
      return { row, composite: compositeScore(rel, b) };
    })
    .sort((a, b) => b.composite - a.composite);

  const picked: BusinessRowWithTags[] = [];
  const categoryCounts = new Map<number, number>();

  for (const { row } of ranked) {
    if (picked.length >= limit) break;
    const c = row.category_id;
    if (c != null && (categoryCounts.get(c) ?? 0) >= 4) continue;
    picked.push(row);
    if (c != null) categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
  }

  for (const { row } of ranked) {
    if (picked.length >= limit) break;
    if (picked.some((p) => p.id === row.id)) continue;
    picked.push(row);
  }

  return picked.slice(0, limit);
}
