-- Service vendor taxonomy (separate from storefront business_categories).
-- Apply: supabase db push / SQL Editor, then:
--   npx tsx scripts/classify-service-categories.ts --dry-run
--   npx tsx scripts/classify-service-categories.ts --apply

CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  sort int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published',
  archived_at timestamptz,
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_categories_slug_idx ON public.service_categories (slug);
CREATE INDEX IF NOT EXISTS service_categories_status_idx ON public.service_categories (status);

INSERT INTO public.service_categories (title, slug, excerpt, sort) VALUES
  ('Landscaping', 'landscaping', 'Lawn design, planting, and yard maintenance', 10),
  ('Lawn care', 'lawn_care', 'Mowing, fertilizing, and turf care', 20),
  ('Pool & spa', 'pool_spa', 'Pool cleaning, maintenance, and repair', 30),
  ('Cleaning', 'cleaning', 'Home, rental, and deep cleaning', 40),
  ('Pressure washing', 'pressure_washing', 'Exterior, driveway, and deck cleaning', 50),
  ('Plumbing', 'plumbing', 'Repairs, installs, and emergencies', 60),
  ('Electrical', 'electrical', 'Wiring, panels, and lighting', 70),
  ('HVAC', 'hvac', 'Heating, cooling, and air quality', 80),
  ('Painting', 'painting', 'Interior and exterior painting', 90),
  ('Handyman', 'handyman', 'General repairs and small projects', 100),
  ('Roofing', 'roofing', 'Roof repair, replacement, and inspection', 110),
  ('Pest control', 'pest_control', 'Prevention and treatment', 120),
  ('Moving & hauling', 'moving', 'Moves, junk removal, and delivery', 130),
  ('Marine & boat', 'marine_boat', 'Boat service, docks, and marine trades', 140),
  ('Contractors', 'contractors', 'General contracting and remodels', 150),
  ('Property management', 'property_management', 'Rental and HOA services', 160)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS service_category_id uuid REFERENCES public.service_categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS businesses_service_category_id_idx
  ON public.businesses (service_category_id)
  WHERE service_category_id IS NOT NULL;

-- CREATE OR REPLACE cannot reorder b.* columns (e.g. after embedding was added to businesses).
DROP VIEW IF EXISTS public.businesses_view;

CREATE VIEW public.businesses_view AS
SELECT
  b.*,
  resolve_directus_file_url(b.main_image) AS main_image_url,
  resolve_directus_file_url(b.hero_image) AS hero_image_url,
  sc.slug AS service_category_slug,
  sc.title AS service_category_title
FROM public.businesses b
LEFT JOIN public.service_categories sc ON sc.id = b.service_category_id;

-- hybrid_search_businesses: optional service category filter (in addition to storefront category).
CREATE OR REPLACE FUNCTION public.hybrid_search_businesses(
  query_text        text,
  query_embedding   vector(1536),
  match_count       int      DEFAULT 24,
  p_town_id         text     DEFAULT NULL,
  p_town_ids        text[]   DEFAULT NULL,
  p_anchor_town_id  text     DEFAULT NULL,
  p_category_id     text     DEFAULT NULL,
  p_is_service_business boolean DEFAULT NULL,
  p_service_category_id text DEFAULT NULL,
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
  service_category_id   text,
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
    b.service_category_id::text,
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
    AND (p_service_category_id IS NULL OR b.service_category_id::text = p_service_category_id)
  ORDER BY
    b.embedding <=> query_embedding,
    CASE WHEN p_anchor_town_id IS NOT NULL AND b.town_id::text = p_anchor_town_id THEN 0 ELSE 1 END,
    COALESCE(b.featured, false) DESC,
    COALESCE(b.review_rating_cached, 0) DESC,
    b.title
  LIMIT match_count;
$$;

-- Avoid duplicate overload (geo-only 10-param vs service-category 11-param).
DROP FUNCTION IF EXISTS public.hybrid_search_businesses(
  text,
  vector(1536),
  int,
  text,
  text[],
  text,
  text,
  boolean,
  float8,
  float8
);
