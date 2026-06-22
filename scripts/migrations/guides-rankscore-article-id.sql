-- RankScore article sync: stable external id on guides rows.
-- Run once in Supabase SQL editor before enabling automated sync.

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS rankscore_article_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS guides_rankscore_article_id_uidx
  ON public.guides (rankscore_article_id)
  WHERE rankscore_article_id IS NOT NULL;
