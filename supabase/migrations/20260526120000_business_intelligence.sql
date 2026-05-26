-- Business intelligence: structured tags and Q&A document for semantic search.
--
-- Adds structured facet columns (business_type, item/dietary/meal/atmosphere/occasion tags)
-- and a qa_document column used as the embedding source (replaces search_profile for embeddings).
--
-- Also replaces hybrid_search_businesses with a version that:
--   • Accepts p_town_ids text[] for multi-town OR filtering
--   • Accepts p_anchor_town_id text for anchor-town tiebreaking
--   • Returns the new structured columns for composite scoring in JS
--
-- After applying:
--   npx tsx local/generate-business-intelligence.ts        # generate tags + Q&A docs
--   npx tsx local/generate-embeddings.ts --force           # re-embed from Q&A docs
--
-- PREREQUISITE: pgvector + 20260524130000_pgvector_embeddings.sql must already be applied.

-- Structured facet columns
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_type       text,
  ADD COLUMN IF NOT EXISTS item_tags           text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary_tags        text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meal_period_tags    text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS atmosphere_tags     text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occasion_tags       text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS qa_document         text,
  ADD COLUMN IF NOT EXISTS qa_document_updated_at timestamptz;

-- Updated hybrid_search_businesses: multi-town, anchor boost, new columns.
CREATE OR REPLACE FUNCTION public.hybrid_search_businesses(
  query_text        text,
  query_embedding   vector(1536),
  match_count       int      DEFAULT 24,
  p_town_id         text     DEFAULT NULL,
  p_town_ids        text[]   DEFAULT NULL,
  p_anchor_town_id  text     DEFAULT NULL,
  p_category_id     text     DEFAULT NULL
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
    (1 - (b.embedding <=> query_embedding))::real AS vec_similarity
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
  ORDER BY
    b.embedding <=> query_embedding,
    CASE WHEN p_anchor_town_id IS NOT NULL AND b.town_id::text = p_anchor_town_id THEN 0 ELSE 1 END,
    COALESCE(b.featured, false) DESC,
    COALESCE(b.review_rating_cached, 0) DESC,
    b.title
  LIMIT match_count;
$$;
