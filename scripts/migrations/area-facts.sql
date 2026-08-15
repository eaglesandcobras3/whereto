/**
 * Area "at a glance" facts (PostHog `area_facts`).
 * Apply in Supabase SQL editor before enabling the flag.
 *
 * Mirrors town-facts columns on `public.areas`.
 * Then run scripts/migrations/area-facts-seed.sql for initial copy.
 */

ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS at_a_glance_description text,
  ADD COLUMN IF NOT EXISTS walkability_rating text,
  ADD COLUMN IF NOT EXISTS walkability_subtext text,
  ADD COLUMN IF NOT EXISTS beach_type text,
  ADD COLUMN IF NOT EXISTS beach_type_subtext text,
  ADD COLUMN IF NOT EXISTS dining_rating text,
  ADD COLUMN IF NOT EXISTS dining_subtext text,
  ADD COLUMN IF NOT EXISTS getting_around_summary text,
  ADD COLUMN IF NOT EXISTS getting_around_subtext text,
  ADD COLUMN IF NOT EXISTS highlights text[],
  ADD COLUMN IF NOT EXISTS beach_access_details text,
  ADD COLUMN IF NOT EXISTS getting_around_details text,
  ADD COLUMN IF NOT EXISTS dining_town_center_details text,
  ADD COLUMN IF NOT EXISTS parking_details text;

COMMENT ON COLUMN public.areas.at_a_glance_description IS
  'Short intro under “{area} at a glance” on the area profile section.';
COMMENT ON COLUMN public.areas.walkability_rating IS
  'Walkability metric value (e.g. High).';
COMMENT ON COLUMN public.areas.walkability_subtext IS
  'Walkability metric supporting line.';
COMMENT ON COLUMN public.areas.beach_type IS
  'Beach access metric value (e.g. Short walk, Few blocks south).';
COMMENT ON COLUMN public.areas.beach_type_subtext IS
  'Beach access metric supporting line.';
COMMENT ON COLUMN public.areas.dining_rating IS
  'Dining metric value (e.g. Walkable).';
COMMENT ON COLUMN public.areas.dining_subtext IS
  'Dining metric supporting line.';
COMMENT ON COLUMN public.areas.getting_around_summary IS
  'Getting-around metric value (e.g. Walk • Bike).';
COMMENT ON COLUMN public.areas.getting_around_subtext IS
  'Getting-around metric supporting line.';
COMMENT ON COLUMN public.areas.highlights IS
  'Highlight pills for the area profile (e.g. Walkable shopping).';
COMMENT ON COLUMN public.areas.beach_access_details IS
  'Detail card copy for beach access.';
COMMENT ON COLUMN public.areas.getting_around_details IS
  'Detail card copy for getting around.';
COMMENT ON COLUMN public.areas.dining_town_center_details IS
  'Detail card copy for dining & town center.';
COMMENT ON COLUMN public.areas.parking_details IS
  'Detail card copy for parking.';
