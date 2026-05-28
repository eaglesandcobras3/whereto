export type BusinessPayload = {
  id: string;
  name: string;
  slug?: string;
  address?: string | null;
  town_id?: number | null;
  town_name?: string | null;
  category_id?: number | null;
  category_name?: string;
  lat?: number;
  lng?: number;
  phone?: string | null;
  website?: string | null;
  price_level?: number | null;
  listing_rating?: number | null;
  listing_review_count?: number | null;
  tags?: string[];
  ai_summary?: string | null;
  image_url?: string | null;
  hero_image_url?: string | null;
  has_physical_location?: boolean;
};

/** How results were retrieved after the degradation ladder (dev / sampled diagnostics). */
export type SearchRetrievalPath =
  | "hybrid_strict"
  | "hybrid_relaxed"
  | "ilike"
  | "browse_no_text";

/** Per-stage counts for tuning ranking without adding new TS forks. */
export type SearchRetrievalMetrics = {
  path: SearchRetrievalPath;
  attempted_paths: SearchRetrievalPath[];
  rpc_row_count?: number;
  after_accommodation_filter?: number;
  after_vec_floor?: number;
  after_post_rank_strict?: number;
  after_post_rank_relaxed?: number;
  after_sidebar_filters?: number;
  ilike_applied?: boolean;
};

export type SearchDebugInfo = {
  intent: unknown;
  filterCategoryId: string | null;
  resolvedTownId: string | undefined;
  nearTownIds: string[] | undefined;
  searchTermOverride: string | undefined;
  skipIlike: boolean;
  /** True only for `/search` directory browse chips with no typed `q`. Typed NL clears this. */
  pageBrowseWithoutQuery: boolean;
  retrieval?: SearchRetrievalMetrics;
};

/** Effective filters resolved from AI intent + explicit URL params. Always populated in production. */
export type ResolvedFilters = {
  town_ids: string[];        // town IDs constraining results (AI-detected or explicit)
  category_slugs: string[];  // category slugs constraining results
  vibe_tags: string[];       // intent tag slugs constraining results (kid_friendly, romantic, etc.)
  price_bucket: "inexpensive" | "moderate" | "expensive" | null;
};

export type SearchResultPayload = {
  query: string;
  query_hash: string;
  normalized_query: string;
  summary: string;
  total_results?: number;
  page?: number;
  page_size?: number;
  recommendations: Array<{
    business_id: string;
    rank: number;
    headline: string;
    explanation: string;
    highlighted_tags: string[];
    business: BusinessPayload;
    /** Dev-only: cosine similarity from vector search (0–1). */
    _vec_similarity?: number;
    /** Dev-only: composite score (structuredMatch + vecSim + quality). */
    _composite?: number;
  }>;
  suggestions?: string[];
  cached: boolean;
  cache_id?: string;
  resolved_filters?: ResolvedFilters;
  _debug?: SearchDebugInfo;
  /** Dev-only mirror of `_debug.retrieval` for quick inspection in API responses. */
  _retrieval?: SearchRetrievalMetrics;
  /** Set when `SEARCH_LEARNING_ENABLED` — client sends back on result click. */
  impression_id?: string;
};
