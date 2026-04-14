-- Town-page-only areas: omit from /search browse (type=areas | access) but keep on town hub.

ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS include_in_site_browse BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.areas.include_in_site_browse IS
  'When false, row is hidden from site-wide area browse (/search?type=areas|access). Still listed on that town''s hub (Local Guide).';

UPDATE public.areas
SET include_in_site_browse = FALSE
WHERE slug = 'grayton-central';
