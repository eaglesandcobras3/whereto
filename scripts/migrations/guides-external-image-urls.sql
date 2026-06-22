-- External hero URLs for guides (RankScore Pexels/CDN links, etc.).
-- `main_image` / `hero_image` remain Directus UUIDs; use these for full URLs.

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS main_image_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;
