-- Broader non-district places: state/national parks, preserves, named landmarks, trailheads,
-- transit/parking hubs, scenic markers — anything that is not a walkable "neighborhood" area.
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
  'Place kind: shopping_area, district, square, development, neighborhood, or point_of_interest (parks, preserves, landmarks, trailheads, transit hubs, signage).';
