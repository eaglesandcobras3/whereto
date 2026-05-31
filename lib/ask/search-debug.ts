import type { SearchResultPayload } from "@/lib/search/types";

export type AskSearchDebug = {
  tool: "searchBusinesses";
  toolInput: {
    query: string;
    town_or_area?: string;
    category?: string;
    category_normalized: string | null;
    tags?: string[];
    price_level?: number;
    limit?: number;
  };
  constrainTownId?: string;
  resultCount: number;
  query: string;
  normalized_query: string;
  summary: string;
  total_results?: number;
  resolved_filters?: SearchResultPayload["resolved_filters"];
  confidence?: SearchResultPayload["confidence"];
  _debug?: SearchResultPayload["_debug"];
  _retrieval?: SearchResultPayload["_retrieval"];
  topResults: Array<{
    business_id: string;
    title: string;
    composite?: number;
    vec_similarity?: number;
  }>;
  effectiveQuery?: string;
  effectiveVibeTags?: string[];
  attempts?: Array<{ label: string; strategyId?: string; resultCount: number }>;
  discoveryThemes?: string[];
  reviewNotes?: Array<{
    rank: number;
    title: string;
    score: number;
    strategies: string[];
    why: string;
  }>;
};

type CaptureInput = {
  toolInput: {
    query: string;
    town_or_area?: string;
    category?: string;
    tags?: string[];
    price_level?: number;
    limit?: number;
  };
  categorySlug: string | null;
  constrainTownId?: string;
  payload: SearchResultPayload;
  resultCount: number;
  attempts?: Array<{ label: string; strategyId?: string; resultCount: number }>;
  discoveryThemes?: string[];
  reviewNotes?: Array<{
    rank: number;
    title: string;
    score: number;
    strategies: string[];
    why: string;
  }>;
  effectiveQuery?: string;
  effectiveVibeTags?: string[];
};

/** Dev-only snapshot of the last searchBusinesses tool run (mirrors /search `_debug`). */
export function captureAskSearchDebug(input: CaptureInput): AskSearchDebug | undefined {
  if (process.env.NODE_ENV !== "development") return undefined;

  return {
    tool: "searchBusinesses",
    toolInput: {
      query: input.toolInput.query,
      town_or_area: input.toolInput.town_or_area,
      category: input.toolInput.category,
      category_normalized: input.categorySlug,
      tags: input.toolInput.tags,
      price_level: input.toolInput.price_level,
      limit: input.toolInput.limit,
    },
    constrainTownId: input.constrainTownId,
    resultCount: input.resultCount,
    query: input.payload.query,
    normalized_query: input.payload.normalized_query,
    summary: input.payload.summary,
    total_results: input.payload.total_results,
    resolved_filters: input.payload.resolved_filters,
    confidence: input.payload.confidence,
    _debug: input.payload._debug,
    _retrieval: input.payload._retrieval,
    topResults: input.payload.recommendations.slice(0, 8).map((r) => ({
      business_id: r.business_id,
      title: r.business.name,
      composite: r.score_breakdown?.composite ?? r._composite,
      vec_similarity: r.score_breakdown?.vec_similarity ?? r._vec_similarity,
    })),
    effectiveQuery: input.effectiveQuery,
    effectiveVibeTags: input.effectiveVibeTags,
    attempts: input.attempts,
    discoveryThemes: input.discoveryThemes,
    reviewNotes: input.reviewNotes,
  };
}
