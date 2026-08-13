-- Allow visitor field reports (`listing_field_flag`) on portal_review_items.
-- Original CHECK was ('claim', 'new_listing', 'edit', 'photo'). App code later added
-- free onboard, rentals, and listing_field_flag without widening the constraint.
-- Inserts then fail with 23514 and the UI shows "Could not save your report."
-- Safe to re-run.

-- Anonymous visitor reports (and free onboard) have no auth user.
ALTER TABLE public.portal_review_items
  ALTER COLUMN submitted_by DROP NOT NULL;

COMMENT ON COLUMN public.portal_review_items.submitted_by IS
  'Auth user for portal submissions; NULL for anonymous intake and listing_field_flag reports.';

-- Known name from the original table DDL. Also drop any other CHECK that only
-- covers `type` (Postgres stores IN (...) as = ANY (ARRAY[...])).
ALTER TABLE public.portal_review_items
  DROP CONSTRAINT IF EXISTS portal_review_items_type_check;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
     AND NOT a.attisdropped
    WHERE c.conrelid = 'public.portal_review_items'::regclass
      AND c.contype = 'c'
      AND a.attname = 'type'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.portal_review_items DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END$$;

ALTER TABLE public.portal_review_items
  ADD CONSTRAINT portal_review_items_type_check
  CHECK (type IN (
    'claim',
    'new_listing',
    'edit',
    'photo',
    'free_new_listing',
    'free_update',
    'free_removal',
    'rental_listing_submission',
    'rental_partner_application',
    'listing_field_flag'
  ));
