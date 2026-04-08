CREATE TABLE public.business_scores_history (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  confidence_score NUMERIC(4, 3),
  freshness_score NUMERIC(4, 3),
  engagement_score NUMERIC(4, 3),
  exploration_score NUMERIC(4, 3),
  completeness_score NUMERIC(4, 3),
  negative_feedback_adjustment NUMERIC(4, 3),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scores_history_business ON public.business_scores_history (business_id, computed_at DESC);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.towns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_scores_history ENABLE ROW LEVEL SECURITY;

-- Public read for discovery data
CREATE POLICY towns_read_all ON public.towns FOR SELECT USING (TRUE);
CREATE POLICY categories_read_all ON public.categories FOR SELECT USING (TRUE);
CREATE POLICY subcategories_read_all ON public.subcategories FOR SELECT USING (TRUE);
CREATE POLICY tags_read_all ON public.tags FOR SELECT USING (TRUE);
CREATE POLICY businesses_read_all ON public.businesses FOR SELECT USING (TRUE);
CREATE POLICY business_tags_read_all ON public.business_tags FOR SELECT USING (TRUE);

-- Profiles: users read/update own
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin policies (service role bypasses RLS; these are for authenticated admins using anon key + JWT)
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY search_jobs_admin_all ON public.search_jobs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY query_cache_admin_select ON public.query_cache FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- query_cache: no direct client write; API uses service role

-- User saves
CREATE POLICY user_saves_select_own ON public.user_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_saves_insert_own ON public.user_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_saves_delete_own ON public.user_saves FOR DELETE USING (auth.uid() = user_id);

-- Shares: public read by id via API (prefer service role in API); allow select for share page if using client — use service role only in practice
CREATE POLICY shares_read_all ON public.shares FOR SELECT USING (TRUE);

-- Impressions / interactions: insert for authenticated or anon — allow insert with null user
CREATE POLICY impressions_insert ON public.impressions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY impressions_admin_select ON public.impressions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );
CREATE POLICY interactions_insert ON public.interactions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY interactions_admin_select ON public.interactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- Feedback & suppressions
CREATE POLICY user_feedback_insert ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (user_id IS NULL AND auth.uid() IS NULL));
CREATE POLICY user_feedback_select_own ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY user_feedback_admin_select ON public.user_feedback FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY user_suppressions_all_own ON public.user_suppressions FOR ALL USING (auth.uid() = user_id);

-- Admin business write
CREATE POLICY businesses_admin_write ON public.businesses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY business_tags_admin_write ON public.business_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY scores_history_admin ON public.business_scores_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- ---------------------------------------------------------------------------
-- Grants: public read for catalog; sensitive tables only via service role (Next.js API)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.towns, public.categories, public.subcategories, public.tags,
  public.businesses, public.business_tags TO anon, authenticated;
GRANT SELECT ON public.shares TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_saves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_suppressions TO authenticated;
GRANT INSERT ON public.impressions, public.interactions, public.user_feedback TO anon, authenticated;
