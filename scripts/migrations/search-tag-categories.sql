-- Map search tags to unified leaf categories (many-to-many).
-- Source of truth for seed/resync: docs/tags-cats.csv via scripts/import-tag-categories-csv.ts
-- Run once: apply in Supabase SQL editor, then:
--   npx tsx scripts/import-tag-categories-csv.ts

CREATE TABLE IF NOT EXISTS public.search_tag_categories (
  tag text NOT NULL REFERENCES public.search_tags_vocabulary (tag) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.business_categories (id) ON DELETE CASCADE,
  PRIMARY KEY (tag, category_id)
);

CREATE INDEX IF NOT EXISTS search_tag_categories_category_id_idx
  ON public.search_tag_categories (category_id);

COMMENT ON TABLE public.search_tag_categories IS
  'Suggested search tags per business_categories leaf (subcategory). Used by free intake form.';
