-- Split "services" from location-based businesses.
-- Businesses: physical places (restaurants, stores, etc.)
-- Services: providers that are not tied to a physical storefront/location.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS has_physical_location BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.businesses.has_physical_location IS
  'TRUE for physical storefront/location listings. FALSE for service-area / non-location services.';

-- Backfill heuristic for existing "services" rows with no usable address/coordinates.
UPDATE public.businesses b
SET has_physical_location = FALSE
FROM public.categories c
WHERE b.category_id = c.id
  AND c.slug = 'services'
  AND COALESCE(TRIM(b.address), '') = ''
  AND (b.lat IS NULL OR b.lng IS NULL);

CREATE INDEX IF NOT EXISTS idx_businesses_location_split
  ON public.businesses (has_physical_location, category_id, status);

