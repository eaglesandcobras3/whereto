-- Search quality & geo: data_quality_score column + updated hybrid_search_businesses.
--
-- data_quality_score (0.0–1.0): metadata completeness signal used in composite ranking.
-- Populated by: npx tsx local/compute-data-quality.ts
-- Default 0.5 means existing rows contribute neutrally until script runs.
--
-- hybrid_search_businesses gains:
--   • data_quality_score in return columns (for composite scoring)
--   • p_user_lat / p_user_lng (optional) → geo_distance_km return column
--
-- After applying:
--   npx tsx local/compute-data-quality.ts     # score existing businesses
--   npx tsx local/generate-embeddings.ts      # re-embed if needed

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS data_quality_score real NOT NULL DEFAULT 0.5;

CREATE INDEX IF NOT EXISTS businesses_data_quality_score_idx
  ON public.businesses (data_quality_score);

-- Updated hybrid_search_businesses: adds data_quality_score + optional geo distance.
CREATE OR REPLACE FUNCTION public.hybrid_search_businesses(
  query_text        text,
  query_embedding   vector(1536),
  match_count       int      DEFAULT 24,
  p_town_id         text     DEFAULT NULL,
  p_town_ids        text[]   DEFAULT NULL,
  p_anchor_town_id  text     DEFAULT NULL,
  p_category_id     text     DEFAULT NULL,
  p_is_service_business boolean DEFAULT NULL,
  -- Optional user coordinates for geo-distance scoring (degrees, WGS-84).
  p_user_lat        float8   DEFAULT NULL,
  p_user_lng        float8   DEFAULT NULL
)
RETURNS TABLE (
  id                    text,
  slug                  text,
  title                 text,
  excerpt               text,
  address               text,
  phone                 text,
  website               text,
  map_lat               float8,
  map_lng               float8,
  review_rating_cached  float8,
  review_count_cached   float8,
  price_level           text,
  main_image            text,
  hero_image            text,
  main_image_url        text,
  hero_image_url        text,
  status                text,
  featured              boolean,
  date_updated          timestamptz,
  town_id               text,
  primary_category_id   text,
  intent_tags           json,
  business_type         text,
  item_tags             text[],
  dietary_tags          text[],
  meal_period_tags      text[],
  atmosphere_tags       text[],
  occasion_tags         text[],
  data_quality_score    real,
  is_service_business   boolean,
  vec_similarity        real,
  -- NULL when p_user_lat / p_user_lng are not supplied.
  geo_distance_km       float8
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id::text,
    b.slug,
    b.title,
    b.excerpt,
    b.address,
    b.phone,
    b.website,
    b.map_lat,
    b.map_lng,
    b.review_rating_cached,
    b.review_count_cached,
    b.price_level::text,
    b.main_image,
    b.hero_image,
    resolve_directus_file_url(b.main_image)  AS main_image_url,
    resolve_directus_file_url(b.hero_image)  AS hero_image_url,
    b.status,
    b.featured,
    b.date_updated,
    b.town_id::text,
    b.primary_category_id::text,
    b.intent_tags,
    b.business_type,
    b.item_tags,
    b.dietary_tags,
    b.meal_period_tags,
    b.atmosphere_tags,
    b.occasion_tags,
    COALESCE(b.data_quality_score, 0.5)::real AS data_quality_score,
    b.is_service_business,
    (1 - (b.embedding <=> query_embedding))::real AS vec_similarity,
    -- Haversine approximation in km (accurate enough for ≤ 50 km distances)
    CASE
      WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
           AND b.map_lat IS NOT NULL AND b.map_lng IS NOT NULL
      THEN
        6371.0 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(b.map_lat - p_user_lat) / 2), 2) +
          COS(RADIANS(p_user_lat)) * COS(RADIANS(b.map_lat)) *
          POWER(SIN(RADIANS(b.map_lng - p_user_lng) / 2), 2)
        ))
      ELSE NULL
    END AS geo_distance_km
  FROM public.businesses b
  WHERE
    b.archived_at IS NULL
    AND b.status = 'published'
    AND b.is_hidden_from_search IS NOT TRUE
    AND b.embedding IS NOT NULL
    AND (
      (p_town_id IS NULL AND p_town_ids IS NULL)
      OR (p_town_ids IS NOT NULL AND b.town_id::text = ANY(p_town_ids))
      OR (p_town_ids IS NULL AND p_town_id IS NOT NULL AND b.town_id::text = p_town_id)
    )
    AND (p_category_id IS NULL OR b.primary_category_id::text = p_category_id)
    AND (p_is_service_business IS NULL OR b.is_service_business = p_is_service_business)
  ORDER BY
    b.embedding <=> query_embedding,
    CASE WHEN p_anchor_town_id IS NOT NULL AND b.town_id::text = p_anchor_town_id THEN 0 ELSE 1 END,
    COALESCE(b.featured, false) DESC,
    COALESCE(b.review_rating_cached, 0) DESC,
    b.title
  LIMIT match_count;
$$;
