/**
 * Free onboard: allow anonymous portal_review_items + free intake review types.
 * Run in Supabase SQL editor before enabling PostHog `free_onboard`.
 *
 * Safe to re-run: submitted_by DROP NOT NULL is a no-op when already nullable;
 * type check is dropped/recreated idempotently.
 */

-- Anonymous free intake submissions have no auth user.
ALTER TABLE public.portal_review_items
  ALTER COLUMN submitted_by DROP NOT NULL;

COMMENT ON COLUMN public.portal_review_items.submitted_by IS
  'Auth user for portal submissions; NULL for anonymous free_onboard intake.';

-- Portal types plus free onboard intake types (required for /list-your-business inserts).
ALTER TABLE public.portal_review_items
  DROP CONSTRAINT IF EXISTS portal_review_items_type_check;

ALTER TABLE public.portal_review_items
  ADD CONSTRAINT portal_review_items_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'claim'::text,
        'new_listing'::text,
        'edit'::text,
        'photo'::text,
        'free_new_listing'::text,
        'free_update'::text,
        'free_removal'::text
      ]
    )
  );
