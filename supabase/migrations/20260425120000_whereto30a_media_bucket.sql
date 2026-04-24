-- Public bucket is **whereto30a-media** (not whereto-media). Normalizer + resolver
-- map legacy names to the real bucket.

CREATE OR REPLACE FUNCTION public.normalize_directus_file_storage_bucket(file_storage text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE lower(btrim(COALESCE(file_storage, '')))
      WHEN '' THEN 'whereto30a-media'
      WHEN 'supabase' THEN 'whereto30a-media'
      WHEN 'whereto-media' THEN 'whereto30a-media'
      WHEN 'whereto30a-media' THEN 'whereto30a-media'
      WHEN 'cms-media' THEN 'cms-media'
      WHEN 'business-images' THEN 'business-images'
      ELSE 'whereto30a-media'
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
          'https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/whereto30a-media/',
          file_id
        )
    END
$$;

COMMENT ON FUNCTION public.normalize_directus_file_storage_bucket(text) IS
  'Maps directus_files.storage to a public bucket; use whereto30a-media (legacy: whereto-media, supabase).';
