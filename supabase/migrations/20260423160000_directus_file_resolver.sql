-- Function to resolve Directus file UUIDs to Supabase Storage public URLs
-- Usage: SELECT resolve_directus_file_url(main_image) FROM businesses;

CREATE OR REPLACE FUNCTION public.resolve_directus_file_url(file_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN file_id IS NULL THEN NULL
      ELSE concat(
        'https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/',
        COALESCE(df.storage, 'whereto-media'),
        '/',
        df.filename_disk
      )
    END
  FROM directus_files df
  WHERE df.id = file_id
$$;

-- Also create a text version for when the column stores text (some tables store UUID as text)
CREATE OR REPLACE FUNCTION public.resolve_directus_file_url(file_id text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN file_id IS NULL OR file_id = '' THEN NULL
      WHEN file_id ~ '^https?://' THEN file_id  -- Already a URL, return as-is
      WHEN file_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        -- It's a UUID, look it up
        (SELECT concat(
          'https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/',
          COALESCE(df.storage, 'whereto-media'),
          '/',
          df.filename_disk
        )
        FROM directus_files df
        WHERE df.id = file_id::uuid)
      ELSE
        -- Assume it's a storage key, build URL
        concat('https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/whereto-media/', file_id)
    END
$$;

COMMENT ON FUNCTION public.resolve_directus_file_url(uuid) IS 'Resolves a Directus file UUID to a Supabase Storage public URL';
COMMENT ON FUNCTION public.resolve_directus_file_url(text) IS 'Resolves a Directus file UUID (as text) or storage key to a Supabase Storage public URL';

-- Create views with resolved image URLs for easy querying

CREATE OR REPLACE VIEW public.towns_view AS
SELECT
  t.*,
  resolve_directus_file_url(t.main_image) as main_image_url,
  resolve_directus_file_url(t.hero_image) as hero_image_url
FROM public.towns t;

CREATE OR REPLACE VIEW public.areas_view AS
SELECT
  a.*,
  resolve_directus_file_url(a.main_image) as main_image_url,
  resolve_directus_file_url(a.hero_image) as hero_image_url
FROM public.areas a;

CREATE OR REPLACE VIEW public.businesses_view AS
SELECT
  b.*,
  resolve_directus_file_url(b.main_image) as main_image_url,
  resolve_directus_file_url(b.hero_image) as hero_image_url
FROM public.businesses b;

CREATE OR REPLACE VIEW public.events_view AS
SELECT
  e.*,
  resolve_directus_file_url(e.main_image) as main_image_url,
  resolve_directus_file_url(e.hero_image) as hero_image_url
FROM public.events e;

CREATE OR REPLACE VIEW public.guides_view AS
SELECT
  g.*,
  resolve_directus_file_url(g.main_image) as main_image_url,
  resolve_directus_file_url(g.hero_image) as hero_image_url
FROM public.guides g;

CREATE OR REPLACE VIEW public.points_of_interest_view AS
SELECT
  p.*,
  resolve_directus_file_url(p.main_image) as main_image_url,
  resolve_directus_file_url(p.hero_image) as hero_image_url
FROM public.points_of_interest p;
