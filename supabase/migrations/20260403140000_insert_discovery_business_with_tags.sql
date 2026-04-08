-- Atomic insert: one business row + taxonomy-linked business_tags (Phase 1 ingestion; superseded by later migrations).
CREATE OR REPLACE FUNCTION public.insert_discovery_business_with_tags(
  p_google_place_id VARCHAR(255),
  p_name VARCHAR(255),
  p_address VARCHAR(500),
  p_town_id INT,
  p_category_id INT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_phone VARCHAR(50),
  p_website VARCHAR(500),
  p_google_rating NUMERIC(2, 1),
  p_google_review_count INT,
  p_price_level INT,
  p_hours_json JSONB,
  p_status VARCHAR(20),
  p_tag_ids INT[]
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
    status
  )
  VALUES (
    p_google_place_id,
    p_name,
    p_address,
    p_town_id,
    p_category_id,
    p_lat,
    p_lng,
    p_phone,
    p_website,
    p_google_rating,
    p_google_review_count,
    p_price_level,
    p_hours_json,
    p_status
  )
  RETURNING id INTO new_id;

  IF p_tag_ids IS NOT NULL AND cardinality(p_tag_ids) > 0 THEN
    INSERT INTO public.business_tags (business_id, tag_id, source, confidence)
    SELECT new_id, t, 'google', 0.90::NUMERIC(3, 2)
    FROM (
      SELECT DISTINCT unnest(p_tag_ids) AS t
    ) s
    ON CONFLICT (business_id, tag_id) DO NOTHING;
  END IF;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_discovery_business_with_tags(
  VARCHAR(255), VARCHAR(255), VARCHAR(500), INT, INT,
  DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR(50), VARCHAR(500),
  NUMERIC(2, 1), INT, INT, JSONB, VARCHAR(20), INT[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_discovery_business_with_tags(
  VARCHAR(255), VARCHAR(255), VARCHAR(500), INT, INT,
  DOUBLE PRECISION, DOUBLE PRECISION, VARCHAR(50), VARCHAR(500),
  NUMERIC(2, 1), INT, INT, JSONB, VARCHAR(20), INT[]
) TO service_role;
