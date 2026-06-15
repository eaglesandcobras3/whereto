import type { QueryPlan } from "@/lib/search/query-plan-v2";

/** Text sent to the embedding API — keeps user intent plus rule anchor terms. */
export function v2EmbeddingInput(plan: QueryPlan, normalizedQuery: string): string {
  if (plan.searchTerms.length === 0) return normalizedQuery;
  return `${normalizedQuery} ${plan.searchTerms.join(" ")}`.trim();
}
