-- Community-verified listing flag.
-- Set true when a non-admin free-onboard add/update (or portal edit/new listing) is approved.
-- Run in Supabase SQL editor, then recreate businesses_view so the column is selectable.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.is_verified IS
  'True after a non-admin user listing add/update is approved. Shows verified badge; hides bottom owner CTA.';

-- PostgreSQL views with SELECT b.* do not pick up columns added after CREATE VIEW.
DROP VIEW IF EXISTS public.businesses_view;

CREATE VIEW public.businesses_view AS
SELECT
  b.*,
  resolve_directus_file_url(b.main_image) AS main_image_url,
  resolve_directus_file_url(b.hero_image) AS hero_image_url,
  sc.slug AS service_category_slug,
  sc.title AS service_category_title
FROM public.businesses b
LEFT JOIN public.service_categories sc ON sc.id = b.service_category_id;
