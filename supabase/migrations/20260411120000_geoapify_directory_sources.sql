-- Geoapify / OSM-backed directory: provenance tables, nullable legacy external id column,
-- category → Geoapify category mapping, atomic insert RPC.

-- ---------------------------------------------------------------------------
-- business_sources (one row per external identifier; dedupe on source + record)
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_sources (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  source_name VARCHAR(32) NOT NULL
    CHECK (source_name IN (
      'geoapify', 'osm', 'here', 'owner', 'google_legacy', 'seed'
    )),
  source_record_id VARCHAR(512) NOT NULL,
  source_url TEXT,
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.700,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attribution_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_name, source_record_id)
);

CREATE INDEX idx_business_sources_business ON public.business_sources (business_id);

ALTER TABLE public.business_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_sources_read_all ON public.business_sources FOR SELECT USING (TRUE);

GRANT SELECT ON public.business_sources TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- business_images (owner / licensed / open license; future uploads)
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  image_type VARCHAR(32) NOT NULL
    CHECK (image_type IN ('owner', 'licensed', 'commons', 'mapillary', 'temporary')),
  source_name VARCHAR(64),
  source_url TEXT,
  license_type VARCHAR(64),
  attribution_text TEXT,
  storage_mode VARCHAR(24) NOT NULL DEFAULT 'hosted'
    CHECK (storage_mode IN ('hosted', 'external', 'temporary')),
  approved_for_display BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  storage_object_path TEXT,
  public_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_images_business ON public.business_images (business_id);

ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_images_read_all ON public.business_images FOR SELECT USING (TRUE);

GRANT SELECT ON public.business_images TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Categories: Geoapify Places category codes (OSM-derived)
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS geoapify_categories TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.categories
SET geoapify_categories = ARRAY['catering.restaurant', 'catering.fast_food', 'catering.food_court']::TEXT[]
WHERE slug = 'restaurants';

UPDATE public.categories
SET geoapify_categories = ARRAY['catering.cafe', 'commercial.cafe']::TEXT[]
WHERE slug = 'coffee_shops';

UPDATE public.categories
SET geoapify_categories = ARRAY['catering.bar', 'catering.pub']::TEXT[]
WHERE slug = 'bars';

UPDATE public.categories
SET geoapify_categories = ARRAY['entertainment.tourism', 'leisure.park', 'sport.fitness']::TEXT[]
WHERE slug = 'activities';

UPDATE public.categories
SET geoapify_categories = ARRAY[
  'commercial.shopping_mall',
  'commercial.clothing',
  'commercial.gift_and_souvenir',
  'commercial.department_store'
]::TEXT[]
WHERE slug = 'shopping';

UPDATE public.categories
SET geoapify_categories = ARRAY[
  'commercial.beauty',
  'healthcare.clinic_or_praxis',
  'service.beauty',
  'service.photography'
]::TEXT[]
WHERE slug = 'services';

-- ---------------------------------------------------------------------------
-- businesses: allow internal-only listings (external id optional)
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_google_place_id_key;

ALTER TABLE public.businesses
  ALTER COLUMN google_place_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_google_place_id_unique
  ON public.businesses (google_place_id)
  WHERE google_place_id IS NOT NULL;

COMMENT ON COLUMN public.businesses.google_place_id IS
  'Legacy optional external id (e.g. seed:*). Geoapify listings use business_sources; later migration renames this column.';

-- ---------------------------------------------------------------------------
-- Backfill sources for existing rows (provenance)
-- ---------------------------------------------------------------------------
INSERT INTO public.business_sources (
  business_id,
  source_name,
  source_record_id,
  source_url,
  attribution_required,
  confidence_score,
  last_verified_at
)
SELECT
  b.id,
  CASE
    WHEN b.google_place_id LIKE 'seed:%' THEN 'seed'::VARCHAR(32)
    ELSE 'google_legacy'::VARCHAR(32)
  END,
  b.google_place_id,
  NULL,
  (b.google_place_id NOT LIKE 'seed:%'),
  CASE
    WHEN b.google_place_id LIKE 'seed:%' THEN 1.000::NUMERIC(4, 3)
    ELSE 0.600::NUMERIC(4, 3)
  END,
  b.last_refreshed_at
FROM public.businesses b
WHERE b.google_place_id IS NOT NULL
ON CONFLICT (source_name, source_record_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Replace discovery RPC: directory listing + source row (no third-party photo refs)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.insert_discovery_business_with_tags(
  VARCHAR(255), VARCHAR(255), VARCHAR(500), INT, INT,
  DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR(50), VARCHAR(500),
  NUMERIC(2, 1), INT, INT, JSONB, VARCHAR(20), INT[], TEXT[]
);

DROP FUNCTION IF EXISTS public.insert_discovery_business_with_tags(
  VARCHAR(255), VARCHAR(255), VARCHAR(500), INT, INT,
  DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR(50), VARCHAR(500),
  NUMERIC(2, 1), INT, INT, JSONB, VARCHAR(20), INT[]
);

CREATE OR REPLACE FUNCTION public.insert_directory_listing_with_tags(
  p_name VARCHAR(255),
  p_address VARCHAR(500),
  p_town_id INT,
  p_category_id INT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_phone VARCHAR(50),
  p_website VARCHAR(500),
  p_hours_json JSONB,
  p_status VARCHAR(20),
  p_tag_ids INT[],
  p_source_name VARCHAR(32),
  p_source_record_id VARCHAR(512),
  p_source_url TEXT,
  p_attribution_required BOOLEAN,
  p_listing_confidence NUMERIC(4, 3)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.businesses (
    google_place_id,
    name,
    address,
    town_id,
    category_id,
    lat,
    lng,
    phone,
    website,
    google_rating,
    google_review_count,
    price_level,
    hours_json,
    status,
    google_photos,
    confidence_score
  )
  VALUES (
    NULL,
    p_name,
    p_address,
    p_town_id,
    p_category_id,
    p_lat,
    p_lng,
    p_phone,
    p_website,
    NULL,
    0,
    NULL,
    p_hours_json,
    p_status,
    NULL,
    COALESCE(p_listing_confidence, 0.550::NUMERIC(4, 3))
  )
  RETURNING id INTO new_id;

  INSERT INTO public.business_sources (
    business_id,
    source_name,
    source_record_id,
    source_url,
    attribution_required,
    confidence_score,
    last_verified_at
  )
  VALUES (
    new_id,
    p_source_name,
    p_source_record_id,
    p_source_url,
    COALESCE(p_attribution_required, TRUE),
    0.750::NUMERIC(4, 3),
    NOW()
  );

  IF p_tag_ids IS NOT NULL AND cardinality(p_tag_ids) > 0 THEN
    INSERT INTO public.business_tags (business_id, tag_id, source, confidence)
    SELECT new_id, t, 'directory', 0.85::NUMERIC(3, 2)
    FROM (
      SELECT DISTINCT unnest(p_tag_ids) AS t
    ) s
    ON CONFLICT (business_id, tag_id) DO NOTHING;
  END IF;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_directory_listing_with_tags(
  VARCHAR(255), VARCHAR(500), INT, INT,
  DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR(50), VARCHAR(500),
  JSONB, VARCHAR(20), INT[], VARCHAR(32), VARCHAR(512), TEXT, BOOLEAN, NUMERIC(4, 3)
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_directory_listing_with_tags(
  VARCHAR(255), VARCHAR(500), INT, INT,
  DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR(50), VARCHAR(500),
  JSONB, VARCHAR(20), INT[], VARCHAR(32), VARCHAR(512), TEXT, BOOLEAN, NUMERIC(4, 3)
) TO service_role;
