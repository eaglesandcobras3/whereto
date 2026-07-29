/**
 * Community tips (PostHog `community_tips`).
 * Apply in Supabase SQL editor before enabling the flag.
 *
 * - Attribution city on profiles (no age; semi-anonymous public display)
 * - Text tips on businesses, towns, areas, and guides; optional 1–5 stars
 * - One tip per user per entity; pending until admin publishes
 */

-- Home / visiting-from city for “Someone from Birmingham said…” attribution.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS attribution_city text;

COMMENT ON COLUMN public.profiles.attribution_city IS
  'Home or visiting-from city for semi-anonymous tip attribution. Never shown as a username.';

CREATE TABLE IF NOT EXISTS public.community_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entity_type text NOT NULL
    CHECK (entity_type IN ('business', 'town', 'area', 'guide')),
  entity_id uuid NOT NULL,
  body text NOT NULL
    CHECK (char_length(trim(body)) >= 15 AND char_length(body) <= 2000),
  -- Optional star rating; text tip is always required.
  rating smallint
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  -- Snapshot at submit time so profile city edits do not rewrite published copy.
  attribution_city text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'rejected', 'hidden')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_tips_user_entity_unique UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS community_tips_entity_published_idx
  ON public.community_tips (entity_type, entity_id, created_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS community_tips_status_created_idx
  ON public.community_tips (status, created_at DESC);

CREATE INDEX IF NOT EXISTS community_tips_user_idx
  ON public.community_tips (user_id, updated_at DESC);

COMMENT ON TABLE public.community_tips IS
  'User text tips for businesses, towns, areas, guides (optional star rating). Public pages show published rows only; attribution is city-based, not username.';

ALTER TABLE public.community_tips ENABLE ROW LEVEL SECURITY;

-- Authenticated users manage their own rows (public reads go through service role / API).
DROP POLICY IF EXISTS community_tips_select_own ON public.community_tips;
CREATE POLICY community_tips_select_own
  ON public.community_tips
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS community_tips_insert_own ON public.community_tips;
CREATE POLICY community_tips_insert_own
  ON public.community_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_tips_update_own ON public.community_tips;
CREATE POLICY community_tips_update_own
  ON public.community_tips
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_tips_delete_own ON public.community_tips;
CREATE POLICY community_tips_delete_own
  ON public.community_tips
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Profiles: users can update their own attribution_city.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_own_attribution'
  ) THEN
    CREATE POLICY profiles_update_own_attribution
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN duplicate_object THEN
    NULL;
END $$;
