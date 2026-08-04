/**
 * Town "at a glance" facts (PostHog `town_facts`).
 * Apply in Supabase SQL editor before enabling the flag.
 *
 * Seeds practical profile fields used by the town page section below the hero.
 * Then run scripts/migrations/town-facts-seed.sql for initial copy.
 */

ALTER TABLE public.towns
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

COMMENT ON COLUMN public.towns.at_a_glance_description IS
  'Short intro under “{town} at a glance” on the town profile section.';
COMMENT ON COLUMN public.towns.walkability_rating IS
  'Walkability metric value (e.g. Excellent).';
COMMENT ON COLUMN public.towns.walkability_subtext IS
  'Walkability metric supporting line.';
COMMENT ON COLUMN public.towns.beach_type IS
  'Beach type metric value (e.g. Private, Public).';
COMMENT ON COLUMN public.towns.beach_type_subtext IS
  'Beach type metric supporting line.';
COMMENT ON COLUMN public.towns.dining_rating IS
  'Dining metric value (e.g. Extensive).';
COMMENT ON COLUMN public.towns.dining_subtext IS
  'Dining metric supporting line.';
COMMENT ON COLUMN public.towns.getting_around_summary IS
  'Getting-around metric value (e.g. Walk • Bike).';
COMMENT ON COLUMN public.towns.getting_around_subtext IS
  'Getting-around metric supporting line.';
COMMENT ON COLUMN public.towns.highlights IS
  'Highlight pills for the town profile (e.g. Boutique Shopping).';
COMMENT ON COLUMN public.towns.beach_access_details IS
  'Detail card copy for beach access.';
COMMENT ON COLUMN public.towns.getting_around_details IS
  'Detail card copy for getting around.';
COMMENT ON COLUMN public.towns.dining_town_center_details IS
  'Detail card copy for dining & town center.';
COMMENT ON COLUMN public.towns.parking_details IS
  'Detail card copy for parking.';
