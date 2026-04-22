-- Town image fields for distinct thumbnail and wide hero treatments.
ALTER TABLE public.towns
  ADD COLUMN IF NOT EXISTS hero_image_thumb_url text,
  ADD COLUMN IF NOT EXISTS hero_image_wide_url text;

