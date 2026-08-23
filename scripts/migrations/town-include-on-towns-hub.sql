-- Towns hub browse: omit from /towns (and home town grid) when explicitly false.
-- NULL and true = visible (legacy rows stay NULL → no breaking change).

ALTER TABLE public.towns
  ADD COLUMN IF NOT EXISTS include_on_towns_hub boolean;

COMMENT ON COLUMN public.towns.include_on_towns_hub IS
  'When false, published town is hidden from /towns hub listing. NULL and true show.';
