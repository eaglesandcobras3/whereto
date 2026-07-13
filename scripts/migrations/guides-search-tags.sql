-- Search tags on guides (aligned with businesses.search_tags / search_tags_vocabulary).
-- Run once: npx supabase db query --linked -f scripts/migrations/guides-search-tags.sql

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS search_tags text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.guides.search_tags IS
  'Discoverable tags for guides; same vocabulary as businesses.search_tags.';

CREATE INDEX IF NOT EXISTS guides_search_tags_gin_idx
  ON public.guides USING gin (search_tags);
