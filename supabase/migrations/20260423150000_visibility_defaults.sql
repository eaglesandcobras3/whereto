-- Set proper defaults for visibility fields so items created in Directus are visible by default
-- The app filter requires: archived_at IS NULL AND (is_hidden_from_search IS NULL OR = false)

-- Set default for is_hidden_from_search to NULL (visible) on all content tables
-- This ensures new items created through Directus are visible in search

ALTER TABLE public.towns
  ALTER COLUMN is_hidden_from_search SET DEFAULT NULL;

ALTER TABLE public.areas
  ALTER COLUMN is_hidden_from_search SET DEFAULT NULL;

ALTER TABLE public.businesses
  ALTER COLUMN is_hidden_from_search SET DEFAULT NULL;

ALTER TABLE public.events
  ALTER COLUMN is_hidden_from_search SET DEFAULT NULL;

ALTER TABLE public.guides
  ALTER COLUMN is_hidden_from_search SET DEFAULT NULL;

ALTER TABLE public.points_of_interest
  ALTER COLUMN is_hidden_from_search SET DEFAULT NULL;

-- Also fix any existing items that were created with is_hidden_from_search = true
-- but aren't actually meant to be hidden (archived_at is null)

UPDATE public.towns
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL AND is_hidden_from_search = true;

UPDATE public.areas
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL AND is_hidden_from_search = true;

UPDATE public.businesses
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL AND is_hidden_from_search = true;

UPDATE public.events
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL AND is_hidden_from_search = true;

UPDATE public.guides
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL AND is_hidden_from_search = true;

UPDATE public.points_of_interest
SET is_hidden_from_search = NULL
WHERE archived_at IS NULL AND is_hidden_from_search = true;

-- Note: If you want items to be hidden by default and require manual publishing,
-- change the default to TRUE and update Directus to uncheck on publish.
-- Current approach: items are visible by default, check box to hide.
