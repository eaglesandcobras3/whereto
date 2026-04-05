-- Migration: Add expanded coastal towns (Destin, Miramar Beach, Sandestin, etc.)
-- and additional 30A communities + Panama City Beach
-- See plan for WhereTo30A premium redesign

-- ---------------------------------------------------------------------------
-- New region for Destin/Miramar area
-- ---------------------------------------------------------------------------
INSERT INTO public.regions (name, slug)
VALUES ('Destin & Miramar Beach', 'destin-miramar')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.regions (name, slug)
VALUES ('Panama City Beach', 'panama-city-beach')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- New towns: Destin / Miramar Beach / Sandestin
-- ---------------------------------------------------------------------------
INSERT INTO public.towns (name, slug, center_lat, center_lng, search_radius_meters)
VALUES
  ('Destin', 'destin', 30.3935, -86.4958, 8000),
  ('Miramar Beach', 'miramar-beach', 30.3743, -86.3580, 6000),
  ('Sandestin', 'sandestin', 30.3913, -86.3227, 6000)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Additional 30A communities
-- ---------------------------------------------------------------------------
INSERT INTO public.towns (name, slug, center_lat, center_lng, search_radius_meters)
VALUES
  ('Dune Allen Beach', 'dune-allen-beach', 30.3580, -86.2000, 4000),
  ('Gulf Place', 'gulf-place', 30.3600, -86.2200, 4000),
  ('Seagrove Beach', 'seagrove-beach', 30.2950, -86.0700, 4000),
  ('Prominence', 'prominence', 30.3550, -86.2100, 4000)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Panama City Beach
-- ---------------------------------------------------------------------------
INSERT INTO public.towns (name, slug, center_lat, center_lng, search_radius_meters)
VALUES
  ('Panama City Beach', 'panama-city-beach', 30.1766, -85.8055, 12000)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Assign region_id to new towns
-- ---------------------------------------------------------------------------

-- Destin/Miramar region
UPDATE public.towns t
SET region_id = r.id
FROM public.regions r
WHERE r.slug = 'destin-miramar'
  AND t.slug IN ('destin', 'miramar-beach', 'sandestin')
  AND t.region_id IS NULL;

-- 30A region for new 30A communities
UPDATE public.towns t
SET region_id = r.id
FROM public.regions r
WHERE r.slug = '30a'
  AND t.slug IN ('dune-allen-beach', 'gulf-place', 'seagrove-beach', 'prominence')
  AND t.region_id IS NULL;

-- Panama City Beach region
UPDATE public.towns t
SET region_id = r.id
FROM public.regions r
WHERE r.slug = 'panama-city-beach'
  AND t.slug = 'panama-city-beach'
  AND t.region_id IS NULL;

-- ---------------------------------------------------------------------------
-- Town adjacencies for the new towns
-- ---------------------------------------------------------------------------

-- Helper function to insert adjacency (handles a < b ordering)
CREATE OR REPLACE FUNCTION insert_adjacency(slug_a TEXT, slug_b TEXT)
RETURNS VOID AS $$
DECLARE
  id_a INT;
  id_b INT;
BEGIN
  SELECT id INTO id_a FROM public.towns WHERE slug = slug_a;
  SELECT id INTO id_b FROM public.towns WHERE slug = slug_b;

  IF id_a IS NOT NULL AND id_b IS NOT NULL THEN
    IF id_a < id_b THEN
      INSERT INTO public.town_adjacency (town_id_a, town_id_b)
      VALUES (id_a, id_b)
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.town_adjacency (town_id_a, town_id_b)
      VALUES (id_b, id_a)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Destin area chain: Destin <-> Miramar Beach <-> Sandestin <-> Santa Rosa Beach
SELECT insert_adjacency('destin', 'miramar-beach');
SELECT insert_adjacency('miramar-beach', 'sandestin');
SELECT insert_adjacency('sandestin', 'santa-rosa-beach');
SELECT insert_adjacency('sandestin', 'dune-allen-beach');

-- 30A chain (west to east) with new towns:
-- Dune Allen Beach <-> Gulf Place <-> Blue Mountain Beach <-> Grayton Beach
SELECT insert_adjacency('dune-allen-beach', 'gulf-place');
SELECT insert_adjacency('dune-allen-beach', 'santa-rosa-beach');
SELECT insert_adjacency('gulf-place', 'blue-mountain-beach');
SELECT insert_adjacency('gulf-place', 'santa-rosa-beach');

-- Grayton Beach <-> Watercolor <-> Seaside <-> Seagrove Beach
SELECT insert_adjacency('grayton-beach', 'watercolor');
SELECT insert_adjacency('watercolor', 'seaside');
SELECT insert_adjacency('seaside', 'seagrove-beach');

-- Seagrove Beach <-> Watersound <-> Seacrest Beach
SELECT insert_adjacency('seagrove-beach', 'watersound');
SELECT insert_adjacency('watersound', 'seacrest-beach');

-- Seacrest Beach <-> Alys Beach <-> Rosemary Beach <-> Inlet Beach
SELECT insert_adjacency('seacrest-beach', 'alys-beach');
SELECT insert_adjacency('alys-beach', 'rosemary-beach');

-- Prominence connects to Santa Rosa Beach area
SELECT insert_adjacency('prominence', 'santa-rosa-beach');
SELECT insert_adjacency('prominence', 'dune-allen-beach');

-- Panama City Beach connects to Inlet Beach (east end of 30A)
SELECT insert_adjacency('inlet-beach', 'panama-city-beach');

-- Cleanup helper function
DROP FUNCTION insert_adjacency(TEXT, TEXT);

-- ---------------------------------------------------------------------------
-- Create discovery jobs for new towns
-- ---------------------------------------------------------------------------
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
WHERE t.slug IN (
  'destin',
  'miramar-beach',
  'sandestin',
  'dune-allen-beach',
  'gulf-place',
  'seagrove-beach',
  'prominence',
  'panama-city-beach'
)
AND c.slug IN ('restaurants', 'coffee_shops', 'bars', 'activities', 'shopping')
AND NOT EXISTS (
  SELECT 1 FROM public.search_jobs sj
  WHERE sj.job_type = 'discovery'
    AND sj.category_id = c.id
    AND sj.town_id = t.id
);
