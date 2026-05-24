-- pgvector: semantic embedding search for businesses
--
-- PREREQUISITE: Enable the pgvector extension in your Supabase project first:
--   Dashboard → Database → Extensions → search "vector" → Enable
--
-- After enabling pgvector, apply this migration.
-- Then run:  npx tsx local/generate-embeddings.ts
-- to populate embeddings for all published businesses.

CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to businesses (OpenAI text-embedding-3-small = 1536 dims).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Embedding generation status so the batch script can track progress.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- HNSW index for fast approximate nearest-neighbour search (cosine similarity).
-- m=16, ef_construction=64 are good defaults for a small-to-medium dataset.
CREATE INDEX IF NOT EXISTS businesses_embedding_hnsw_idx
  ON public.businesses
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RPC: hybrid search — FTS pre-filter + vector re-ranking.
-- Returns up to `match_count` businesses ordered by combined score.
CREATE OR REPLACE FUNCTION public.hybrid_search_businesses(
  query_text      text,
  query_embedding vector(1536),
  match_count     int     DEFAULT 24,
  p_town_id       text    DEFAULT NULL,
  p_category_id   text    DEFAULT NULL
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
  main_image            text,
  hero_image            text,
  main_image_url        text,
  hero_image_url        text,
  status                text,
  featured              boolean,
  date_updated          timestamptz,
  town_id               text,
  primary_category_id   text,
  fts_rank              real,
  vec_similarity        real
)
LANGUAGE sql
STABLE
AS $$
  WITH candidates AS (
    SELECT
      b.id,
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
      b.main_image,
      b.hero_image,
      resolve_directus_file_url(b.main_image)  AS main_image_url,
      resolve_directus_file_url(b.hero_image)  AS hero_image_url,
      b.status,
      b.featured,
      b.date_updated,
      b.town_id::text,
      b.primary_category_id::text,
      CASE
        WHEN query_text <> '' AND b.search_vector IS NOT NULL
        THEN ts_rank(b.search_vector, websearch_to_tsquery('english', query_text))
        ELSE 0
      END AS fts_rank,
      CASE
        WHEN b.embedding IS NOT NULL
        THEN 1 - (b.embedding <=> query_embedding)
        ELSE 0
      END AS vec_similarity
    FROM public.businesses b
    WHERE
      b.archived_at IS NULL
      AND b.is_hidden_from_search IS NOT TRUE
      AND (p_town_id IS NULL OR b.town_id::text = p_town_id)
      AND (p_category_id IS NULL OR b.primary_category_id::text = p_category_id)
      AND (
        query_text = ''
        OR b.search_vector @@ websearch_to_tsquery('english', query_text)
        OR (b.embedding IS NOT NULL AND 1 - (b.embedding <=> query_embedding) > 0.65)
      )
  )
  SELECT
    c.id, c.slug, c.title, c.excerpt, c.address, c.phone, c.website,
    c.map_lat, c.map_lng, c.review_rating_cached, c.review_count_cached,
    c.main_image, c.hero_image, c.main_image_url, c.hero_image_url,
    c.status, c.featured, c.date_updated, c.town_id, c.primary_category_id,
    c.fts_rank,
    c.vec_similarity
  FROM candidates c
  ORDER BY
    COALESCE(c.featured, false) DESC,
    (0.4 * c.fts_rank + 0.6 * c.vec_similarity) DESC,
    COALESCE(c.review_rating_cached, 0) DESC,
    c.title
  LIMIT match_count;
$$;
