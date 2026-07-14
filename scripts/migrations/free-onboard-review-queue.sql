/**
 * Free onboard: allow anonymous portal_review_items (nullable submitted_by).
 * Run in Supabase SQL editor before enabling PostHog `free_onboard`.
 */

-- Anonymous free intake submissions have no auth user.
ALTER TABLE public.portal_review_items
  ALTER COLUMN submitted_by DROP NOT NULL;

COMMENT ON COLUMN public.portal_review_items.submitted_by IS
  'Auth user for portal submissions; NULL for anonymous free_onboard intake.';
