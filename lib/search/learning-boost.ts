import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimum impressions in cluster before a business gets a boost (avoid noise). */
export const LEARNING_MIN_IMPRESSIONS = 20;

/** Minimum clicks before boost applies (stronger signal). */
export const LEARNING_MIN_CLICKS = 2;

/** Beta prior for smoothed CTR (clicks / impressions). */
const PRIOR_CTR = 0.04;
const PRIOR_WEIGHT = 15;

/** Max additive boost to composite score (0–1 scale). */
export const LEARNING_MAX_BOOST = 0.1;

export function smoothedCtr(clicks: number, impressions: number): number {
  return (clicks + PRIOR_CTR * PRIOR_WEIGHT) / (impressions + PRIOR_WEIGHT);
}

/**
 * Boost from cluster-specific CTR vs global prior. Returns 0 when CTR is not above prior.
 */
export function learningBoostFromStats(clicks: number, impressions: number): number {
  if (impressions < LEARNING_MIN_IMPRESSIONS || clicks < LEARNING_MIN_CLICKS) return 0;
  const ctr = smoothedCtr(clicks, impressions);
  const excess = ctr - PRIOR_CTR;
  if (excess <= 0) return 0;
  return Math.min(LEARNING_MAX_BOOST, excess * 0.6);
}

export function searchLearningEnabled(): boolean {
  const v = process.env.SEARCH_LEARNING_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Load per-business additive boost for a query cluster (empty map if disabled or no stats). */
export async function loadLearningBoostMap(
  supabase: SupabaseClient,
  clusterKey: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!searchLearningEnabled() || !clusterKey) return out;

  const { data, error } = await supabase
    .from("search_cluster_business_stats")
    .select("business_id, impressions, clicks")
    .eq("cluster_key", clusterKey);

  if (error || !data?.length) return out;

  for (const row of data) {
    const id = String((row as { business_id: string }).business_id);
    const impressions = Number((row as { impressions: number }).impressions ?? 0);
    const clicks = Number((row as { clicks: number }).clicks ?? 0);
    const boost = learningBoostFromStats(clicks, impressions);
    if (boost > 0) out.set(id, boost);
  }

  return out;
}
