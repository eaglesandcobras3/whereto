-- Store map pins as fixed-scale decimals so import/readback keep full lat/lng digits.
-- Dependent views must be dropped before ALTER TYPE; recreate from live definitions.
--
-- If businesses already succeeded and you failed on towns_view, skip §1 and run §2–§3 only.
-- Verify: select table_name, data_type from information_schema.columns
--   where table_schema='public' and column_name in ('map_lat','map_lng')
--     and table_name in ('businesses','towns','areas','rentals');

-- §1 Businesses
DROP VIEW IF EXISTS public.businesses_view;

ALTER TABLE public.businesses
  ALTER COLUMN map_lat TYPE numeric(12, 8) USING round(map_lat::numeric, 8),
  ALTER COLUMN map_lng TYPE numeric(12, 8) USING round(map_lng::numeric, 8);

CREATE VIEW public.businesses_view AS
SELECT
  b.*,
  sc.slug AS service_category_slug,
  sc.title AS service_category_title
FROM public.businesses b
LEFT JOIN public.service_categories sc ON sc.id = b.service_category_id;

-- §2 Towns + areas: capture current view SQL, drop, alter, recreate
DO $$
DECLARE
  towns_def text;
  areas_def text;
BEGIN
  SELECT pg_get_viewdef('public.towns_view'::regclass, true) INTO towns_def;
  SELECT pg_get_viewdef('public.areas_view'::regclass, true) INTO areas_def;

  DROP VIEW IF EXISTS public.towns_view;
  DROP VIEW IF EXISTS public.areas_view;

  ALTER TABLE public.towns
    ALTER COLUMN map_lat TYPE numeric(12, 8) USING round(map_lat::numeric, 8),
    ALTER COLUMN map_lng TYPE numeric(12, 8) USING round(map_lng::numeric, 8);

  ALTER TABLE public.areas
    ALTER COLUMN map_lat TYPE numeric(12, 8) USING round(map_lat::numeric, 8),
    ALTER COLUMN map_lng TYPE numeric(12, 8) USING round(map_lng::numeric, 8);

  EXECUTE 'CREATE VIEW public.towns_view AS ' || towns_def;
  EXECUTE 'CREATE VIEW public.areas_view AS ' || areas_def;
END $$;

-- §3 Rentals — only if the table exists in this environment
DO $$
BEGIN
  IF to_regclass('public.rentals') IS NOT NULL THEN
    ALTER TABLE public.rentals
      ALTER COLUMN map_lat TYPE numeric(12, 8) USING round(map_lat::numeric, 8),
      ALTER COLUMN map_lng TYPE numeric(12, 8) USING round(map_lng::numeric, 8);
  END IF;
END $$;
