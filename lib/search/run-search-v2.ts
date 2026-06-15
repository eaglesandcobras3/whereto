/**
 * Search V2 orchestrator: deterministic routing → hybrid SQL retrieval → light post-rank.
 *
 * Active when SEARCH_V2=1 env var is set. Routed from lib/search/run-search.ts.
 * Keeps the full V1 path intact at SEARCH_V2=0.
 */

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { normalizeQuery, hashQuery } from "@/lib/query-normalize";
import { resolveQueryPlan } from "@/lib/search/resolve-query-plan";
import { explicitFiltersToPartialPlan } from "@/lib/search/query-plan-v2";
import { embedNormalizedSearchQuery } from "@/lib/search/query-embedding";
import { loadLearningBoostMap, learningBoostFromStats } from "@/lib/search/learning-boost";
import { deriveQueryClusterKey } from "@/lib/search/query-cluster";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { v2EmbeddingInput } from "@/lib/search/v2-embedding-input";
import { computeV2RelevanceBoost } from "@/lib/search/v2-relevance-boost";
import type { ScoreBreakdown } from "@/lib/search/scoring";
import type { BusinessPayload, SearchResultPayload } from "@/lib/search/types";

export type RunSearchV2Options = {
  rawQuery: string;
  openaiKey: string | undefined;
  page?: number;
  pageSize?: number;
  sessionId?: string | null;
  userId?: string | null;
  userLat?: number | null;
  userLng?: number | null;
  includeDebug?: boolean;
  // Explicit UI filters — always win over routing rules
  townSlug?: string | null;
  categorySlug?: string | null;
  serviceCategorySlug?: string | null;
  priceLevel?: number | null;
  vibeTags?: string[];
};

// ── RPC row type (matches search_businesses_v2 RETURNS TABLE) ────────────────

type V2Row = {
  id: string;
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  map_lat: number | null;
  map_lng: number | null;
  review_rating_cached: number | null;
  review_count_cached: number | null;
  price_level: string | null;
  main_image: string | null;
  hero_image: string | null;
  main_image_url: string | null;
  hero_image_url: string | null;
  status: string | null;
  featured: boolean | null;
  date_updated: string | null;
  town_id: string | null;
  primary_category_id: string | null;
  intent_tags: unknown;
  business_type: string | null;
  item_tags: string[] | null;
  dietary_tags: string[] | null;
  meal_period_tags: string[] | null;
  atmosphere_tags: string[] | null;
  occasion_tags: string[] | null;
  search_tags: string[] | null;
  data_quality_score: number | null;
  is_service_business: boolean | null;
  fts_score: number;
  vec_score: number;
  qual_score: number;
  geo_score: number;
  geo_distance_km: number | null;
  final_score: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildScoreBreakdown(row: V2Row, learningBoost: number): ScoreBreakdown {
  return {
    composite:       row.final_score + learningBoost,
    structured_match: row.fts_score,
    vec_similarity:  row.vec_score,
    quality:         row.qual_score,
    data_quality:    row.data_quality_score ?? 0.5,
    geo_score:       row.geo_score,
    learning_boost:  learningBoost,
  };
}

function rowToBusinessPayload(row: V2Row): BusinessPayload {
  const img = getPublicImageUrlWithView(row.main_image_url, row.hero_image_url, row.main_image, row.hero_image);
  return {
    id:                   row.id,
    name:                 row.title ?? "",
    slug:                 row.slug ?? undefined,
    address:              row.address ?? null,
    town_id:              null,
    town_name:            null,
    category_id:          null,
    category_name:        undefined,
    lat:                  row.map_lat ?? undefined,
    lng:                  row.map_lng ?? undefined,
    phone:                row.phone ?? null,
    website:              row.website ?? null,
    price_level:          null,
    listing_rating:       row.review_rating_cached ?? null,
    listing_review_count: row.review_count_cached ?? null,
    tags:                 undefined,
    ai_summary:           row.excerpt ?? null,
    image_url:            img,
    hero_image_url:       img,
    has_physical_location: row.map_lat != null && row.map_lng != null,
  };
}

// ── Category/service slug → UUID lookup ─────────────────────────────────────

async function resolveCategoryId(
  supabase: ReturnType<typeof getServiceSupabase>,
  slug: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("business_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function resolveServiceCategoryId(
  supabase: ReturnType<typeof getServiceSupabase>,
  slug: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("service_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

// ── V2 impression log (simplified — avoids V1 SearchPlan dependency) ─────────

async function logV2Impression(
  supabase: ReturnType<typeof getServiceSupabase>,
  opts: {
    rawQuery: string;
    normalizedQuery: string;
    queryHash: string;
    clusterKey: string;
    categorySlug: string | null;
    totalResults: number;
    topRows: V2Row[];
    sessionId?: string | null;
    userId?: string | null;
  },
): Promise<string | null> {
  const top = opts.topRows.slice(0, 12);
  const { data, error } = await supabase
    .from("search_impressions")
    .insert({
      session_id:             opts.sessionId ?? null,
      raw_query:              opts.rawQuery,
      normalized_query:       opts.normalizedQuery,
      query_hash:             opts.queryHash,
      cluster_key:            opts.clusterKey,
      intent_category:        opts.categorySlug,
      resolved_category_slugs: opts.categorySlug ? [opts.categorySlug] : [],
      town_ids:               [],
      retrieval_path:         "v2_hybrid",
      attempted_paths:        ["v2_hybrid"],
      total_results:          opts.totalResults,
      top_business_ids:       top.map(r => r.id),
      top_ranks:              top.map((_, i) => i + 1),
    })
    .select("id")
    .single();
  if (error || !data?.id) return null;
  return String(data.id);
}

// ── Main orchestrator ────────────────────────────────────────────────────────

export async function runSearchV2(opts: RunSearchV2Options): Promise<SearchResultPayload> {
  const supabase    = getServiceSupabase();
  const normalized  = normalizeQuery(opts.rawQuery);
  const queryHash   = hashQuery(normalized);

  // Layer 1: deterministic routing
  const plan = resolveQueryPlan(opts.rawQuery, {
    townSlug:            opts.townSlug,
    categorySlug:        opts.categorySlug,
    serviceCategorySlug: opts.serviceCategorySlug,
    priceLevel:          opts.priceLevel,
    vibeTags:            opts.vibeTags,
  });

  // Layer 2: resolve slugs → UUIDs (parallel)
  const [categoryId, serviceCategoryId, embedding] = await Promise.all([
    plan.categorySlug
      ? resolveCategoryId(supabase, plan.categorySlug)
      : Promise.resolve(null),
    plan.serviceCategorySlug
      ? resolveServiceCategoryId(supabase, plan.serviceCategorySlug)
      : Promise.resolve(null),
    opts.openaiKey
      ? embedNormalizedSearchQuery(
          v2EmbeddingInput(plan, normalized),
          opts.openaiKey,
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  const degraded = embedding === null;

  // Layer 3: SQL hybrid retrieval
  const { data: rows, error: rpcError } = await supabase.rpc("search_businesses_v2", {
    p_query_text:           opts.rawQuery,
    p_query_embedding:      embedding ? `[${embedding.join(",")}]` : null,
    p_category_id:          categoryId,
    p_service_category_id:  serviceCategoryId,
    p_town_ids:             null, // town filter via slug not yet wired (Phase 4 town resolver)
    p_required_tags:        plan.requiredTags.length > 0 ? plan.requiredTags : null,
    p_any_tags:             plan.anyTags.length > 0 ? plan.anyTags : null,
    p_match_count:          (opts.pageSize ?? 12) + 12, // over-fetch for post-rank
    p_user_lat:             opts.userLat ?? null,
    p_user_lng:             opts.userLng ?? null,
  });

  if (rpcError) {
    console.error("search_businesses_v2 RPC error:", rpcError.message);
  }

  const rawRows = (rows as V2Row[] | null) ?? [];

  // Layer 4: light post-rank (learning boost only — no gates, no salvage)
  const clusterKey = deriveQueryClusterKey({
    normalizedQuery: normalized,
    intentCategory:  plan.categorySlug,
    resolvedCategorySlugs: plan.categorySlug ? [plan.categorySlug] : [],
    townIds: [],
  });

  const boostMap = await loadLearningBoostMap(supabase, clusterKey);

  const ranked = rawRows
    .map(row => {
      const learningBoost = boostMap.get(row.id) ?? 0;
      const relevanceBoost = computeV2RelevanceBoost(row, opts.rawQuery, plan);
      const boostedScore = row.final_score + learningBoost + relevanceBoost;
      return { row, boostedScore, boost: learningBoost + relevanceBoost };
    })
    .sort((a, b) => b.boostedScore - a.boostedScore);

  const page     = opts.page ?? 0;
  const pageSize = opts.pageSize ?? 12;
  const pageRows = ranked.slice(page * pageSize, (page + 1) * pageSize);

  // Build response
  const recommendations: SearchResultPayload["recommendations"] = pageRows.map(({ row, boost }, i) => ({
    business_id:     row.id,
    rank:            page * pageSize + i + 1,
    headline:        row.title ?? "Listing",
    explanation:     row.excerpt ?? "",
    highlighted_tags: (row.search_tags ?? []).slice(0, 5),
    business:        rowToBusinessPayload(row),
    score_breakdown: buildScoreBreakdown(row, boost),
  }));

  // Async impression log (fire-and-forget)
  logV2Impression(supabase, {
    rawQuery:        opts.rawQuery,
    normalizedQuery: normalized,
    queryHash,
    clusterKey,
    categorySlug:    plan.categorySlug,
    totalResults:    ranked.length,
    topRows:         ranked.map(r => r.row),
    sessionId:       opts.sessionId,
    userId:          opts.userId,
  }).catch(() => {/* best-effort */});

  const result: SearchResultPayload = {
    query:            opts.rawQuery,
    query_hash:       queryHash,
    normalized_query: normalized,
    summary:          "",
    total_results:    ranked.length,
    page,
    page_size:        pageSize,
    recommendations,
    cached:           false,
  };

  if (degraded || opts.includeDebug) {
    result._debug = {
      intent:                 null,
      pageBrowseWithoutQuery: false,
      filterCategoryId:       categoryId ?? null,
      filterSpecialtyCategoryId: serviceCategoryId ?? null,
      resolvedTownId:         undefined,
      nearTownIds:            undefined,
      searchTermOverride:     plan.searchTerms.join(" ") || undefined,
      skipIlike:              true,
      retrieval: {
        path:            "hybrid_strict",
        attempted_paths: ["hybrid_strict"],
        rpc_row_count:   rawRows.length,
      },
    };
  }

  return result;
}
