-- Phase 2: SEO & town architecture (see docs/TDD-SEO-TOWNS.md)

-- ---------------------------------------------------------------------------
-- Regions
-- ---------------------------------------------------------------------------
CREATE TABLE public.regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.regions (name, slug) VALUES ('30A / Emerald Coast', '30a')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Towns → region
-- ---------------------------------------------------------------------------
ALTER TABLE public.towns
  ADD COLUMN IF NOT EXISTS region_id INT REFERENCES public.regions (id);

UPDATE public.towns t
SET region_id = r.id
FROM public.regions r
WHERE r.slug = '30a' AND t.region_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_towns_region ON public.towns (region_id);

-- ---------------------------------------------------------------------------
-- Town adjacency (unordered pairs, town_id_a < town_id_b)
-- ---------------------------------------------------------------------------
CREATE TABLE public.town_adjacency (
  town_id_a INT NOT NULL REFERENCES public.towns (id) ON DELETE CASCADE,
  town_id_b INT NOT NULL REFERENCES public.towns (id) ON DELETE CASCADE,
  CHECK (town_id_a < town_id_b),
  PRIMARY KEY (town_id_a, town_id_b)
);

CREATE INDEX idx_town_adjacency_a ON public.town_adjacency (town_id_a);
CREATE INDEX idx_town_adjacency_b ON public.town_adjacency (town_id_b);

INSERT INTO public.town_adjacency (town_id_a, town_id_b)
SELECT t1.id, t2.id
FROM public.towns t1
JOIN public.towns t2 ON t1.slug = 'rosemary-beach' AND t2.slug = 'inlet-beach' AND t1.id < t2.id
ON CONFLICT DO NOTHING;

INSERT INTO public.town_adjacency (town_id_a, town_id_b)
SELECT t1.id, t2.id
FROM public.towns t1
JOIN public.towns t2 ON t1.slug = 'seaside' AND t2.slug = 'watercolor' AND t1.id < t2.id
ON CONFLICT DO NOTHING;

INSERT INTO public.town_adjacency (town_id_a, town_id_b)
SELECT t1.id, t2.id
FROM public.towns t1
JOIN public.towns t2 ON t1.slug = 'grayton-beach' AND t2.slug = 'santa-rosa-beach' AND t1.id < t2.id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Business public slug (URL)
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS slug VARCHAR(160);

-- Deterministic unique slug: slugified name + full uuid (no hyphens in suffix)
UPDATE public.businesses b
SET slug = left(
  regexp_replace(
    regexp_replace(lower(trim(b.name)), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  ) || '-' || replace(b.id::text, '-', ''),
  160
)
WHERE b.slug IS NULL OR b.slug = '';

ALTER TABLE public.businesses
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX idx_businesses_slug ON public.businesses (slug);

CREATE OR REPLACE FUNCTION public.ensure_business_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := left(
      regexp_replace(
        regexp_replace(lower(trim(NEW.name)), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      ) || '-' || replace(NEW.id::text, '-', ''),
      160
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS businesses_ensure_slug ON public.businesses;
CREATE TRIGGER businesses_ensure_slug
  BEFORE INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.ensure_business_slug();

-- ---------------------------------------------------------------------------
-- query_cache: recommendation-set fields for SEO / precompute
-- ---------------------------------------------------------------------------
ALTER TABLE public.query_cache
  ADD COLUMN IF NOT EXISTS query_key VARCHAR(200),
  ADD COLUMN IF NOT EXISTS intent_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS town_id INT REFERENCES public.towns (id),
  ADD COLUMN IF NOT EXISTS region_id INT REFERENCES public.regions (id),
  ADD COLUMN IF NOT EXISTS filters JSONB,
  ADD COLUMN IF NOT EXISTS scores_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS seo_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(200);

CREATE UNIQUE INDEX idx_query_cache_query_key_unique
  ON public.query_cache (query_key)
  WHERE query_key IS NOT NULL;

CREATE INDEX idx_query_cache_seo_eligible ON public.query_cache (seo_eligible)
  WHERE seo_eligible = TRUE;

CREATE INDEX idx_query_cache_town ON public.query_cache (town_id);
CREATE INDEX idx_query_cache_region ON public.query_cache (region_id);

-- ---------------------------------------------------------------------------
-- SEO pages
-- ---------------------------------------------------------------------------
CREATE TABLE public.seo_pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(300) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  meta_description VARCHAR(500),
  recommendation_set_id UUID NOT NULL REFERENCES public.query_cache (id) ON DELETE CASCADE,
  location_scope VARCHAR(20) NOT NULL CHECK (location_scope IN ('town', 'region')),
  town_id INT REFERENCES public.towns (id),
  region_id INT REFERENCES public.regions (id),
  content_intro TEXT,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_seo_pages_town ON public.seo_pages (town_id);
CREATE INDEX idx_seo_pages_region ON public.seo_pages (region_id);
CREATE INDEX idx_seo_pages_published ON public.seo_pages (published) WHERE published = TRUE;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.town_adjacency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY regions_read_all ON public.regions FOR SELECT USING (TRUE);
CREATE POLICY town_adjacency_read_all ON public.town_adjacency FOR SELECT USING (TRUE);
CREATE POLICY seo_pages_read_published ON public.seo_pages FOR SELECT USING (published = TRUE);

GRANT SELECT ON public.regions, public.town_adjacency, public.seo_pages TO anon, authenticated;
