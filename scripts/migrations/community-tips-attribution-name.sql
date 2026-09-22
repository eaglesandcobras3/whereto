/**
 * Optional first name on planted community tips (initials placeholder, never a photo).
 * Apply after community-tips-planted.sql.
 */

ALTER TABLE public.community_tips
  ADD COLUMN IF NOT EXISTS attribution_name text;

COMMENT ON COLUMN public.community_tips.attribution_name IS
  'Optional first name for planted-tip initials placeholders. Never a username, email, or photo.';
