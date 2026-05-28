import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchPlan } from "@/lib/search/search-plan";
import type { SearchResultPayload, SearchRetrievalMetrics } from "@/lib/search/types";
import { deriveQueryClusterKey } from "@/lib/search/query-cluster";
import { searchLearningEnabled } from "@/lib/search/learning-boost";

export type LoggedSearchImpression = {
  impressionId: string;
  clusterKey: string;
};

/** Persist one search execution for the learning loop (best-effort; never throws to caller). */
export async function logSearchImpression(
  supabase: SupabaseClient,
  plan: SearchPlan,
  result: SearchResultPayload,
  retrieval: SearchRetrievalMetrics | undefined,
  options?: { sessionId?: string | null; userId?: string | null },
): Promise<LoggedSearchImpression | null> {
  if (!searchLearningEnabled()) return null;

  const clusterKey = deriveQueryClusterKey({
    normalizedQuery: plan.normalizedQuery,
    intentCategory: plan.scoring.intentCategory,
    resolvedCategorySlugs: plan.category.resolvedCategorySlugs,
    townIds:
      plan.explicit.explicitTownIds.length > 0
        ? plan.explicit.explicitTownIds
        : plan.town.resolvedTownId
          ? [plan.town.resolvedTownId]
          : [],
  });

  const top = result.recommendations.slice(0, 12);
  const top_business_ids = top.map((r) => r.business_id);
  const top_ranks = top.map((r) => r.rank);

  const row = {
    session_id: options?.sessionId ?? null,
    user_id: options?.userId ?? null,
    raw_query: plan.rawQuery,
    normalized_query: plan.normalizedQuery,
    query_hash: plan.queryHash,
    cluster_key: clusterKey,
    intent_category: plan.scoring.intentCategory,
    resolved_category_slugs: plan.category.resolvedCategorySlugs,
    town_ids:
      plan.explicit.explicitTownIds.length > 0
        ? plan.explicit.explicitTownIds
        : plan.town.resolvedTownId
          ? [plan.town.resolvedTownId]
          : [],
    retrieval_path: retrieval?.path ?? "ilike",
    attempted_paths: retrieval?.attempted_paths ?? [retrieval?.path ?? "ilike"],
    total_results: result.total_results ?? result.recommendations.length,
    rpc_row_count: retrieval?.rpc_row_count ?? null,
    after_post_rank_strict: retrieval?.after_post_rank_strict ?? null,
    after_post_rank_relaxed: retrieval?.after_post_rank_relaxed ?? null,
    after_sidebar_filters: retrieval?.after_sidebar_filters ?? null,
    top_business_ids,
    top_ranks,
    app_git_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? null,
  };

  const { data, error } = await supabase
    .from("search_impressions")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("logSearchImpression", error?.message ?? "insert failed");
    return null;
  }

  return { impressionId: String(data.id), clusterKey };
}
