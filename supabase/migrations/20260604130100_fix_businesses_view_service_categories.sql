-- Repair businesses_view if 20260604130000 failed at CREATE OR REPLACE VIEW (42P16 column rename).
-- Safe to run even when the prior migration completed after this fix was added to that file.

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
