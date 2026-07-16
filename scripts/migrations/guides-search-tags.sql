-- Search tags on guides (guide-specific; see guide-tags-vocabulary.sql).
-- Run once: npx supabase db query --linked -f scripts/migrations/guides-search-tags.sql

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS search_tags text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.guides.search_tags IS
  'Guide tags from guide_tags_vocabulary (not business search tags). Use all_towns to show on every town/area page.';

CREATE INDEX IF NOT EXISTS guides_search_tags_gin_idx
  ON public.guides USING gin (search_tags);
