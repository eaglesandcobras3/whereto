-- Storage / CDN listing image URLs on businesses (admin upload, portal photos, free intake).
-- `main_image` / `hero_image` remain Directus UUIDs; these columns hold full public URLs.
--
-- Also recreates `businesses_view`: once URL columns exist on the table, the view must NOT
-- re-alias `resolve_directus_file_url(...) AS main_image_url/hero_image_url` (duplicate names).
-- Backfill copies resolved Directus URLs into the new columns first.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS main_image_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;

COMMENT ON COLUMN public.businesses.main_image_url IS
  'Public listing image URL (Supabase Storage or CDN). Preferred over Directus main_image UUID.';
COMMENT ON COLUMN public.businesses.hero_image_url IS
  'Public hero image URL (Supabase Storage or CDN). Preferred over Directus hero_image UUID.';

-- Preserve images that previously only existed via businesses_view resolve aliases.
UPDATE public.businesses
SET main_image_url = resolve_directus_file_url(main_image)
WHERE main_image_url IS NULL
  AND main_image IS NOT NULL
  AND resolve_directus_file_url(main_image) IS NOT NULL;

UPDATE public.businesses
SET hero_image_url = resolve_directus_file_url(hero_image)
WHERE hero_image_url IS NULL
  AND hero_image IS NOT NULL
  AND resolve_directus_file_url(hero_image) IS NOT NULL;

UPDATE public.businesses
SET hero_image_url = main_image_url
WHERE hero_image_url IS NULL
  AND main_image_url IS NOT NULL;

UPDATE public.businesses
SET main_image_url = hero_image_url
WHERE main_image_url IS NULL
  AND hero_image_url IS NOT NULL;

DROP VIEW IF EXISTS public.businesses_view;

CREATE VIEW public.businesses_view AS
SELECT
  b.*,
  sc.slug AS service_category_slug,
  sc.title AS service_category_title
FROM public.businesses b
LEFT JOIN public.service_categories sc ON sc.id = b.service_category_id;
