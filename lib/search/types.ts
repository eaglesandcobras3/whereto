export type SearchResultPayload = {
  query: string;
  query_hash: string;
  normalized_query: string;
  summary: string;
  recommendations: Array<{
    business_id: string;
    rank: number;
    headline: string;
    explanation: string;
    highlighted_tags: string[];
    business: Record<string, unknown>;
  }>;
  suggestions?: string[];
  cached: boolean;
  cache_id?: string;
};
