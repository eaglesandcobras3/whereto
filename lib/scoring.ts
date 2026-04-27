import type { SearchIntent } from "@/lib/intent-schema";
import { getCompositeWeights } from "@/lib/scoring-weights";

export type BusinessForScore = {
  id: string;
  has_physical_location: boolean;
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
  listing_rating: number | null;
  listing_review_count: number | null;
  /** DB `updated_at` for admin “recently edited” sort in search. */
  updated_at?: string | null;
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
  category_name?: string;
  ai_summary?: string | null;
  /** Legacy field; map API photos are not used for new listings. */
  legacy_photo_refs?: string[] | null;
  /** Public Storage URL for listing hero (from `/api/cron/business-images`). */
  hero_image_url?: string | null;
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
  if (b.suspected_closed) return false;
  if (b.admin_suppressed) return false;
  // Keep search resilient to sparse or stale scoring fields.
  // We only hard-block clearly unusable records.
  if (b.confidence_score <= 0) return false;
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
    ((b.listing_rating ?? 0) / 5) * w.ratingTiebreak
  );
}

export type SearchCandidateRankOrder = "relevance" | "updated" | "name";

/** Eligibility + weighted composite + light category diversity (Section 11 intent), or by `updated_at` when `rankOrder` is `updated`. */
export function scoreAndRankCandidates(
  rows: BusinessRowWithTags[],
  intent: SearchIntent,
  townSlugToId: Map<string, number>,
  categorySlugToId: Map<string, number>,
  suppressedIds: Set<string>,
  limit = 15,
  locationScope: LocationRankingScope | null = null,
  rankOrder: SearchCandidateRankOrder = "relevance",
): BusinessRowWithTags[] {
  let eligible = rows.filter((row) => passesEligibility(row, suppressedIds));
  if (intent.category) {
    const cid = categorySlugToId.get(intent.category);
    if (cid != null) {
      const categoryScoped = eligible.filter((row) => row.category_id === cid);
      // If ingestion/content has missing category_id values, do not zero out results.
      if (categoryScoped.length > 0) {
        eligible = categoryScoped;
      }
    }
  }

  /** Town hub / SEO: only listings whose `businesses.town_id` matches the page town (not neighbors). */
  if (intent.location.town && intent.location.radius === "exact") {
    const anchorTid = townSlugToId.get(intent.location.town);
    if (anchorTid != null) {
      eligible = eligible.filter((row) => row.town_id === anchorTid);
    }
  }

  if (rankOrder === "updated") {
    return [...eligible]
      .sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, limit);
  }

  if (rankOrder === "name") {
    return [...eligible]
      .sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }),
      )
      .slice(0, limit);
  }

  const ranked = eligible
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
