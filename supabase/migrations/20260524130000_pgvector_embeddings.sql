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

-- RPC: vector similarity search for businesses.
-- Returns up to `match_count` businesses ordered by cosine similarity to the query embedding,
-- with featured and rating signals as tiebreakers.
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
  vec_similarity        real
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
    b.main_image,
    b.hero_image,
    resolve_directus_file_url(b.main_image)  AS main_image_url,
    resolve_directus_file_url(b.hero_image)  AS hero_image_url,
    b.status,
    b.featured,
    b.date_updated,
    b.town_id::text,
    b.primary_category_id::text,
    (1 - (b.embedding <=> query_embedding))::real AS vec_similarity
  FROM public.businesses b
  WHERE
    b.archived_at IS NULL
    AND b.status = 'published'
    AND b.is_hidden_from_search IS NOT TRUE
    AND b.embedding IS NOT NULL
    AND (p_town_id IS NULL OR b.town_id::text = p_town_id)
    AND (p_category_id IS NULL OR b.primary_category_id::text = p_category_id)
  ORDER BY
    COALESCE(b.featured, false) DESC,
    b.embedding <=> query_embedding,
    COALESCE(b.review_rating_cached, 0) DESC,
    b.title
  LIMIT match_count;
$$;
