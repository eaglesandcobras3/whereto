-- Rename vendor-prefixed columns to neutral names; refresh-queue column; RPC body; source label.

UPDATE public.business_sources
SET source_name = 'legacy_import'
WHERE source_name = 'google_legacy';

ALTER TABLE public.business_sources DROP CONSTRAINT IF EXISTS business_sources_source_name_check;

ALTER TABLE public.business_sources ADD CONSTRAINT business_sources_source_name_check
  CHECK (source_name IN (
    'geoapify', 'osm', 'here', 'owner', 'legacy_import', 'seed'
  ));

DROP INDEX IF EXISTS idx_businesses_google_place_id_unique;
DROP INDEX IF EXISTS idx_businesses_rating;
DROP INDEX IF EXISTS idx_businesses_places_refresh_queue;

ALTER TABLE public.businesses RENAME COLUMN google_place_id TO listing_external_key;
ALTER TABLE public.businesses RENAME COLUMN google_rating TO listing_rating;
ALTER TABLE public.businesses RENAME COLUMN google_review_count TO listing_review_count;
ALTER TABLE public.businesses RENAME COLUMN google_photos TO legacy_photo_refs;
ALTER TABLE public.businesses RENAME COLUMN places_refresh_requested_at TO directory_refresh_requested_at;

CREATE UNIQUE INDEX idx_businesses_listing_external_key_unique
  ON public.businesses (listing_external_key)
  WHERE listing_external_key IS NOT NULL;

CREATE INDEX idx_businesses_listing_rating
  ON public.businesses (listing_rating DESC NULLS LAST);

CREATE INDEX idx_businesses_directory_refresh_queue
  ON public.businesses (directory_refresh_requested_at)
  WHERE directory_refresh_requested_at IS NOT NULL AND status = 'active';

COMMENT ON COLUMN public.businesses.listing_external_key IS
  'Optional external key (e.g. seed:*); canonical provenance is business_sources.';

COMMENT ON COLUMN public.businesses.directory_refresh_requested_at IS
  'When set, directory refresh cron prioritizes this row; cleared after a successful refresh.';

COMMENT ON COLUMN public.businesses.hero_image_fetched_at IS
  'When hero_image_url was last written (e.g. Storage upload).';

ALTER TABLE public.categories RENAME COLUMN google_types TO taxonomy_type_hints;

DROP FUNCTION IF EXISTS public.insert_directory_listing_with_tags(
  VARCHAR(255), VARCHAR(500), INT, INT,
  DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR(50), VARCHAR(500),
  JSONB, VARCHAR(20), INT[], VARCHAR(32), VARCHAR(512), TEXT, BOOLEAN, NUMERIC(4, 3)
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
    listing_external_key,
    name,
    address,
    town_id,
    category_id,
    lat,
    lng,
    phone,
    website,
    listing_rating,
    listing_review_count,
    price_level,
    hours_json,
    status,
    legacy_photo_refs,
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
