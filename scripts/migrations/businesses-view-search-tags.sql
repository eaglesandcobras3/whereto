-- Recreate businesses_view so new `businesses` columns (e.g. search_tags) are exposed.
-- PostgreSQL views with `SELECT b.*` do not pick up columns added after CREATE VIEW.
-- Safe to re-run: idempotent DROP + CREATE with the same join shape as 20260604130100.

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
