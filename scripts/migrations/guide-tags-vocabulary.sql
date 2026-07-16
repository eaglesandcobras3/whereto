-- Guide-specific tag vocabulary (separate from businesses.search_tags / search_tags_vocabulary).
-- Run once: npx supabase db query --linked -f scripts/migrations/guide-tags-vocabulary.sql

CREATE TABLE IF NOT EXISTS public.guide_tags_vocabulary (
  tag text PRIMARY KEY,
  label text,
  date_created timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.guide_tags_vocabulary IS
  'Canonical tag slugs for guides.search_tags. Independent of business search_tags_vocabulary.';

COMMENT ON COLUMN public.guides.search_tags IS
  'Guide tags from guide_tags_vocabulary (not business search tags). Use all_towns to show on every town/area page.';

-- Corridor-wide guides appear on every town and area page.
INSERT INTO public.guide_tags_vocabulary (tag, label)
VALUES ('all_towns', 'All towns')
ON CONFLICT (tag) DO NOTHING;

-- Seed vocabulary from tags already stored on guides (no-op if column missing / empty).
INSERT INTO public.guide_tags_vocabulary (tag)
SELECT DISTINCT LOWER(TRIM(t)) AS tag
FROM public.guides g
CROSS JOIN LATERAL unnest(COALESCE(g.search_tags, '{}'::text[])) AS t
WHERE NULLIF(TRIM(t), '') IS NOT NULL
ON CONFLICT (tag) DO NOTHING;
