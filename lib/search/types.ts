import type { ScoreBreakdown } from "@/lib/search/scoring";

export type { ScoreBreakdown } from "@/lib/search/scoring";

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

/** How results were retrieved after the degradation ladder. */
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
  filterSpecialtyCategoryId?: string | null;
  resolvedTownId: string | undefined;
  nearTownIds: string[] | undefined;
  searchTermOverride: string | undefined;
  skipIlike: boolean;
  pageBrowseWithoutQuery: boolean;
  retrieval?: SearchRetrievalMetrics;
};

/** Effective filters resolved from AI intent + explicit URL params. Always populated. */
export type ResolvedFilters = {
  town_ids: string[];
  category_slugs: string[];
  /** Regional vendor trade filter (`service_categories.slug`). */
  specialty_slugs: string[];
  /** @deprecated Use `specialty_slugs`. */
  service_category_slugs: string[];
  vibe_tags: string[];
  price_bucket: "inexpensive" | "moderate" | "expensive" | null;
};

/** Overall search confidence — always returned, not dev-only. */
export type SearchConfidence = {
  /** 0.0 (very low) – 1.0 (high). */
  score: number;
  /** Human-readable signals used to compute the score. */
  low_confidence_reasons: string[];
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
    /** Scoring breakdown — always present (not dev-only). */
    score_breakdown?: ScoreBreakdown;
    /** @deprecated Use score_breakdown.vec_similarity */
    _vec_similarity?: number;
    /** @deprecated Use score_breakdown.composite */
    _composite?: number;
  }>;
  suggestions?: string[];
  cached: boolean;
  cache_id?: string;
  resolved_filters?: ResolvedFilters;
  /** Overall search confidence — always present. */
  confidence?: SearchConfidence;
  _debug?: SearchDebugInfo;
  _retrieval?: SearchRetrievalMetrics;
  impression_id?: string;
};
