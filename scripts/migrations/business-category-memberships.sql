/**
 * Multi-category memberships for businesses.
 * Keep businesses.primary_category_id as the display/SEO/canonical category.
 * Memberships include primary + up to 4 additional leaves (max 5 enforced in app).
 *
 * Run in Supabase SQL editor after review.
 */

CREATE TABLE IF NOT EXISTS public.business_category_memberships (
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.business_categories (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, category_id)
);

CREATE INDEX IF NOT EXISTS business_category_memberships_category_id_idx
  ON public.business_category_memberships (category_id);

CREATE INDEX IF NOT EXISTS business_category_memberships_business_id_idx
  ON public.business_category_memberships (business_id);

COMMENT ON TABLE public.business_category_memberships IS
  'Leaf category memberships for a business. primary_category_id remains canonical; this table enables secondary browse/filter matches. PostgREST embeds from businesses must use business_categories!primary_category_id (…) because memberships adds a second relationship.';

ALTER TABLE public.business_category_memberships ENABLE ROW LEVEL SECURITY;

-- Public read (directory browse). Writes via service role / server only.
DROP POLICY IF EXISTS business_category_memberships_select_public ON public.business_category_memberships;
CREATE POLICY business_category_memberships_select_public
  ON public.business_category_memberships
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS business_category_memberships_deny_writes ON public.business_category_memberships;
CREATE POLICY business_category_memberships_deny_writes
  ON public.business_category_memberships
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- Backfill: every business with a primary is a member of that leaf.
INSERT INTO public.business_category_memberships (business_id, category_id)
SELECT b.id, b.primary_category_id
FROM public.businesses b
WHERE b.primary_category_id IS NOT NULL
ON CONFLICT (business_id, category_id) DO NOTHING;
