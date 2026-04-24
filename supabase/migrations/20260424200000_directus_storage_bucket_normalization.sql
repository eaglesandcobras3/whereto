-- directus_files.storage is sometimes the storage *driver* name ("supabase"), not the
-- Supabase Storage bucket. Public object URLs were built as
--   .../object/public/supabase/<filename>
-- which 404s ("Bucket not found"). Objects live in whereto-media (and a few other buckets).

CREATE OR REPLACE FUNCTION public.normalize_directus_file_storage_bucket(file_storage text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE lower(btrim(COALESCE(file_storage, '')))
      WHEN '' THEN 'whereto-media'
      WHEN 'supabase' THEN 'whereto-media'
      WHEN 'whereto-media' THEN 'whereto-media'
      WHEN 'cms-media' THEN 'cms-media'
      WHEN 'business-images' THEN 'business-images'
      ELSE 'whereto-media'
    END
$$;

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
        public.normalize_directus_file_storage_bucket(df.storage::text),
        '/',
        df.filename_disk
      )
    END
  FROM public.directus_files df
  WHERE df.id = file_id
$$;

CREATE OR REPLACE FUNCTION public.resolve_directus_file_url(file_id text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN file_id IS NULL OR file_id = '' THEN NULL
      WHEN file_id ~ '^https?://' THEN file_id
      WHEN file_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        (SELECT concat(
          'https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/',
          public.normalize_directus_file_storage_bucket(df.storage::text),
          '/',
          df.filename_disk
        )
        FROM public.directus_files df
        WHERE df.id = file_id::uuid)
      ELSE
        concat(
          'https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/whereto-media/',
          file_id
        )
    END
$$;

COMMENT ON FUNCTION public.normalize_directus_file_storage_bucket(text) IS
  'Maps directus_files.storage to a real Supabase public bucket (whereto-media, etc.); "supabase" is not a bucket name.';

-- Views use these functions; no need to replace views (they call the functions by name).
