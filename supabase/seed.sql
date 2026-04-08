-- Seed reference data + sample businesses (run after migration in SQL editor or `supabase db reset`)

INSERT INTO public.towns (name, slug, center_lat, center_lng, search_radius_meters) VALUES
  ('Rosemary Beach', 'rosemary-beach', 30.2789, -86.0123, 5000),
  ('Alys Beach', 'alys-beach', 30.2654, -86.0182, 5000),
  ('Seaside', 'seaside', 30.3210, -86.1350, 5000),
  ('WaterColor', 'watercolor', 30.3235, -86.1480, 5000),
  ('Grayton Beach', 'grayton-beach', 30.3244, -86.1102, 5000),
  ('Santa Rosa Beach', 'santa-rosa-beach', 30.3719, -86.2456, 8000),
  ('Inlet Beach', 'inlet-beach', 30.2520, -86.0100, 5000),
  ('Seacrest Beach', 'seacrest-beach', 30.2840, -86.0350, 5000),
  ('Watersound', 'watersound', 30.2880, -86.0500, 5000),
  ('Blue Mountain Beach', 'blue-mountain-beach', 30.3080, -86.0950, 5000)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (
  name, slug, taxonomy_type_hints, geoapify_categories, discovery_priority, refresh_interval_days
) VALUES
  ('Restaurants', 'restaurants', ARRAY['restaurant', 'meal_takeaway', 'food'],
    ARRAY['catering.restaurant', 'catering.fast_food', 'catering.food_court'], 1, 60),
  ('Coffee shops', 'coffee_shops', ARRAY['cafe', 'coffee_shop'],
    ARRAY['catering.cafe', 'commercial.cafe'], 2, 45),
  ('Bars', 'bars', ARRAY['bar', 'night_club'],
    ARRAY['catering.bar', 'catering.pub'], 3, 60),
  ('Activities', 'activities', ARRAY['tourist_attraction', 'park', 'gym'],
    ARRAY['entertainment.tourism', 'leisure.park', 'sport.fitness'], 4, 90),
  ('Shopping', 'shopping', ARRAY['shopping_mall', 'store', 'clothing_store'],
    ARRAY['commercial.shopping_mall', 'commercial.clothing', 'commercial.gift_and_souvenir', 'commercial.department_store'], 5, 120),
  ('Services', 'services', ARRAY['spa', 'beauty_salon', 'hair_care'],
    ARRAY['commercial.beauty', 'healthcare.clinic_or_praxis', 'service.beauty', 'service.photography'], 6, 120)
ON CONFLICT (slug) DO UPDATE SET
  geoapify_categories = EXCLUDED.geoapify_categories,
  taxonomy_type_hints = EXCLUDED.taxonomy_type_hints;

INSERT INTO public.tags (name, slug, category, display_order) VALUES
  ('Kid-friendly', 'kid_friendly', 'audience', 10),
  ('Pet-friendly', 'pet_friendly', 'audience', 20),
  ('Outdoor seating', 'outdoor_seating', 'amenity', 30),
  ('Romantic', 'romantic', 'vibe', 40),
  ('Casual', 'casual', 'vibe', 50),
  ('Upscale', 'upscale', 'vibe', 60),
  ('Waterfront', 'waterfront', 'vibe', 70),
  ('Live music', 'live_music', 'amenity', 80),
  ('Gluten-free friendly', 'gluten_free', 'dietary', 90),
  ('Vegan options', 'vegan', 'dietary', 100),
  ('Vegetarian', 'vegetarian', 'dietary', 110),
  ('Seafood', 'seafood', 'cuisine', 120),
  ('Mexican', 'mexican', 'cuisine', 130),
  ('Italian', 'italian', 'cuisine', 140),
  ('Breakfast', 'breakfast', 'meal', 150),
  ('Lunch', 'lunch', 'meal', 160),
  ('Dinner', 'dinner', 'meal', 170),
  ('Brunch', 'brunch', 'meal', 180),
  ('Coffee', 'coffee', 'cuisine', 190),
  ('Date night', 'date_night', 'audience', 200),
  ('Groups', 'groups', 'audience', 210),
  ('Quick bite', 'quick_bite', 'vibe', 220),
  ('Family', 'family', 'audience', 230),
  ('Beach casual', 'beach_casual', 'vibe', 240),
  ('Sunset views', 'sunset_views', 'vibe', 250)
ON CONFLICT (slug) DO NOTHING;

-- Sample businesses (synthetic listing_external_key for local dev)
INSERT INTO public.businesses (
  listing_external_key, name, address, town_id, category_id, lat, lng,
  listing_rating, listing_review_count, price_level, status,
  confidence_score, freshness_score, engagement_score, ai_summary
) VALUES
  (
    'seed:seaside-shack',
    'The Seaside Shack (sample)',
    'Sample St, Seaside, FL',
    (SELECT id FROM public.towns WHERE slug = 'seaside'),
    (SELECT id FROM public.categories WHERE slug = 'restaurants'),
    30.3205, -86.1340,
    4.5, 420, 2, 'active',
    0.72, 0.9, 0.35,
    'Casual Gulf-side spot known for fresh seafood and sunset views. Great for families and beach days.'
  ),
  (
    'seed:alys-espresso',
    'Alys Espresso Bar (sample)',
    'Sample Ave, Alys Beach, FL',
    (SELECT id FROM public.towns WHERE slug = 'alys-beach'),
    (SELECT id FROM public.categories WHERE slug = 'coffee_shops'),
    30.2650, -86.0180,
    4.8, 128, 2, 'active',
    0.80, 0.95, 0.28,
    'Architecturally stunning café with specialty espresso and light pastries. Quiet mornings and date-friendly.'
  )
ON CONFLICT (listing_external_key) DO NOTHING;

-- Idempotent re-run: sample businesses use fixed listing_external_key values above.

INSERT INTO public.business_tags (business_id, tag_id, source, confidence)
SELECT b.id, t.id, 'admin_set', 1.0
FROM public.businesses b
CROSS JOIN public.tags t
WHERE b.listing_external_key = 'seed:seaside-shack' AND t.slug IN ('seafood', 'family', 'kid_friendly', 'sunset_views', 'outdoor_seating')
ON CONFLICT DO NOTHING;

INSERT INTO public.business_tags (business_id, tag_id, source, confidence)
SELECT b.id, t.id, 'admin_set', 1.0
FROM public.businesses b
CROSS JOIN public.tags t
WHERE b.listing_external_key = 'seed:alys-espresso' AND t.slug IN ('coffee', 'romantic', 'date_night', 'outdoor_seating')
ON CONFLICT DO NOTHING;

-- 50 discovery jobs: each town × first 5 categories (idempotent)
INSERT INTO public.search_jobs (job_type, category_id, town_id, query_string, status, priority, next_run_after, max_runs)
SELECT
  'discovery',
  c.id,
  t.id,
  lower(c.name) || ' in ' || t.name || ' FL',
  'pending',
  c.discovery_priority,
  NOW(),
  999
FROM public.towns t
CROSS JOIN public.categories c
WHERE c.slug IN ('restaurants', 'coffee_shops', 'bars', 'activities', 'shopping')
  AND NOT EXISTS (
    SELECT 1 FROM public.search_jobs sj
    WHERE sj.job_type = 'discovery'
      AND sj.category_id = c.id
      AND sj.town_id = t.id
  );
