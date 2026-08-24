-- Suggested extra leaf categories per primary/extra leaf (many-to-many).
-- Source of truth for seed/resync: docs/category-related.csv via scripts/import-category-related-csv.ts
-- Run once in Supabase SQL editor, then:
--   npx tsx scripts/import-category-related-csv.ts

CREATE TABLE IF NOT EXISTS public.category_related_categories (
  category_id uuid NOT NULL
    REFERENCES public.business_categories (id) ON DELETE CASCADE,
  related_category_id uuid NOT NULL
    REFERENCES public.business_categories (id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, related_category_id),
  CHECK (category_id <> related_category_id)
);

CREATE INDEX IF NOT EXISTS category_related_categories_related_idx
  ON public.category_related_categories (related_category_id);

COMMENT ON TABLE public.category_related_categories IS
  'Suggested additional leaf categories when a business primary/extra category is set. Used by intake and admin edit.';
