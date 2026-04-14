-- If an older revision of 20260414190000 created `transit_access`, migrate to `point_of_interest`.
UPDATE public.areas SET area_type = 'point_of_interest' WHERE area_type = 'transit_access';

ALTER TABLE public.areas DROP CONSTRAINT IF EXISTS areas_area_type_check;

ALTER TABLE public.areas
  ADD CONSTRAINT areas_area_type_check CHECK (
    area_type IN (
      'shopping_area',
      'district',
      'square',
      'development',
      'neighborhood',
      'point_of_interest'
    )
  );

COMMENT ON COLUMN public.areas.area_type IS
  'Place kind: walkable districts vs point_of_interest (parks, preserves, landmarks, trailheads, transit hubs, scenic markers).';
