/**
 * Town relationship / 30A corridor neighbors (PostHog `town_relationship`).
 * Apply in Supabase SQL editor before enabling the flag.
 *
 * Directional west/east neighbor slots with display mileage (town-center-to-town-center,
 * rounded to 0.1 mi). Then run scripts/migrations/town-relationships-seed.sql.
 */

CREATE TABLE IF NOT EXISTS public.town_relationships (
  town_id uuid PRIMARY KEY REFERENCES public.towns (id) ON DELETE CASCADE,
  on_corridor boolean NOT NULL DEFAULT true,
  west_1_town_id uuid REFERENCES public.towns (id) ON DELETE SET NULL,
  west_1_miles numeric(4, 1),
  west_2_town_id uuid REFERENCES public.towns (id) ON DELETE SET NULL,
  west_2_miles numeric(4, 1),
  east_1_town_id uuid REFERENCES public.towns (id) ON DELETE SET NULL,
  east_1_miles numeric(4, 1),
  east_2_town_id uuid REFERENCES public.towns (id) ON DELETE SET NULL,
  east_2_miles numeric(4, 1),
  notes text,
  source_url text,
  CONSTRAINT town_relationships_west_1_miles_chk
    CHECK (west_1_miles IS NULL OR west_1_miles > 0),
  CONSTRAINT town_relationships_west_2_miles_chk
    CHECK (west_2_miles IS NULL OR west_2_miles > 0),
  CONSTRAINT town_relationships_east_1_miles_chk
    CHECK (east_1_miles IS NULL OR east_1_miles > 0),
  CONSTRAINT town_relationships_east_2_miles_chk
    CHECK (east_2_miles IS NULL OR east_2_miles > 0)
);

CREATE INDEX IF NOT EXISTS town_relationships_on_corridor_idx
  ON public.town_relationships (on_corridor)
  WHERE on_corridor = true;

COMMENT ON TABLE public.town_relationships IS
  'Directional 30A corridor neighbors + display miles for town detail timeline UI (PostHog town_relationship).';
COMMENT ON COLUMN public.town_relationships.on_corridor IS
  'False for broad areas (e.g. Santa Rosa Beach) that should not show the corridor timeline.';
COMMENT ON COLUMN public.town_relationships.west_1_town_id IS
  'Nearest west neighbor on the corridor spine.';
COMMENT ON COLUMN public.town_relationships.east_1_town_id IS
  'Nearest east neighbor on the corridor spine.';
COMMENT ON COLUMN public.town_relationships.notes IS
  'Ops / editorial notes (not shown in UI).';
COMMENT ON COLUMN public.town_relationships.source_url IS
  'Reference URL for mileage / placement (not shown in UI).';
