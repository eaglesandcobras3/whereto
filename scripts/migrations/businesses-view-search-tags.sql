-- Recreate businesses_view so new `businesses` columns (e.g. search_tags, overview,
-- main_image_url / hero_image_url) are exposed via `b.*`.
-- PostgreSQL views with `SELECT b.*` do not pick up columns added after CREATE VIEW.
-- Safe to re-run: idempotent DROP + CREATE.
--
-- Note: do not re-add `resolve_directus_file_url(...) AS main_image_url/hero_image_url`
-- once those columns exist on `businesses` (duplicate column names). Prefer the table
-- columns; see businesses-external-image-urls.sql for ADD + backfill.

DROP VIEW IF EXISTS public.businesses_view;

CREATE VIEW public.businesses_view AS
SELECT
  b.*,
  sc.slug AS service_category_slug,
  sc.title AS service_category_title
FROM public.businesses b
LEFT JOIN public.service_categories sc ON sc.id = b.service_category_id;
