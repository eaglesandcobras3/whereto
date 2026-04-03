import type { SearchIntent } from "@/lib/intent-schema";

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
  tag_slugs: string[];
  name?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  phone?: string | null;
  website?: string | null;
  price_level?: number | null;
  ai_summary?: string | null;
};

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
  return (
    0.45 * rel +
    0.2 * b.confidence_score +
    0.15 * b.freshness_score +
    0.12 * b.engagement_score +
    0.08 * b.completeness_score +
    b.exploration_score +
    ((b.google_rating ?? 0) / 5) * 0.05
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
): BusinessRowWithTags[] {
  const ranked = rows
    .filter((row) => passesEligibility(row, suppressedIds))
    .map((row) => {
      const { tag_slugs, ...b } = row;
      const rel = relevanceForIntent(
        intent,
        b,
        new Set(tag_slugs),
        townSlugToId,
        categorySlugToId,
      );
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
