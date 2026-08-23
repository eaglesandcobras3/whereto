-- Areas hub browse: omit from /areas when explicitly false.
-- NULL and true = visible (legacy rows stay NULL → no breaking change).

ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS include_in_site_browse boolean;

COMMENT ON COLUMN public.areas.include_in_site_browse IS
  'When false, published area is hidden from /areas hub listing. NULL and true show.';
