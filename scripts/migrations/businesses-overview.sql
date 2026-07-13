-- Extracted overview / opening copy from businesses.content (pre-## preamble).
-- Run once in Supabase SQL editor (or: npx supabase db query --linked -f scripts/migrations/businesses-overview.sql)
-- before scripts/backfill-business-overview.ts.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS overview text;

COMMENT ON COLUMN public.businesses.overview IS
  'Opening overview copied from content (text before the first ## heading). Content is left unchanged.';
