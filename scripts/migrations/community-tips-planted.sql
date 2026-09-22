/**
 * Admin-planted community tips with optional future created_at stamps.
 * Apply in Supabase SQL editor after community-tips.sql.
 *
 * - is_planted marks operator-seeded rows
 * - Planted tips are excluded from the one-tip-per-user unique index
 * - User inserts cannot set is_planted
 */

ALTER TABLE public.community_tips
  ADD COLUMN IF NOT EXISTS is_planted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.community_tips.is_planted IS
  'Admin-seeded tip. Multiple planted tips are allowed per entity; excluded from the one-tip-per-user unique index.';

ALTER TABLE public.community_tips
  DROP CONSTRAINT IF EXISTS community_tips_user_entity_unique;

DROP INDEX IF EXISTS community_tips_user_entity_unique;

CREATE UNIQUE INDEX IF NOT EXISTS community_tips_user_entity_unique
  ON public.community_tips (user_id, entity_type, entity_id)
  WHERE is_planted = false;

DROP POLICY IF EXISTS community_tips_insert_own ON public.community_tips;
CREATE POLICY community_tips_insert_own
  ON public.community_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND is_planted = false
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_notes IS NULL
  );

DROP POLICY IF EXISTS community_tips_update_own ON public.community_tips;
CREATE POLICY community_tips_update_own
  ON public.community_tips
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_planted = false)
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND is_planted = false
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_notes IS NULL
  );
