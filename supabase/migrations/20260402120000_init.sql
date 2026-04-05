-- WhereTo30A (whereto30a) — initial schema (see docs/whereto30a-implementation-plan.md §2)
-- Run via Supabase CLI or SQL editor after enabling extensions.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- ---------------------------------------------------------------------------
-- Profiles (admin flag; extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
CREATE TABLE public.towns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  search_radius_meters INT NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  google_types TEXT[] NOT NULL,
  discovery_priority INT NOT NULL DEFAULT 5,
  refresh_interval_days INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subcategories (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE TABLE public.tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  display_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  town_id INT REFERENCES public.towns (id),
  category_id INT REFERENCES public.categories (id),
  subcategory_id INT REFERENCES public.subcategories (id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(500),
  google_rating NUMERIC(2, 1),
  google_review_count INT NOT NULL DEFAULT 0,
  price_level INT,
  hours_json JSONB,
  google_photos TEXT[],
  ai_summary TEXT,
  ai_summary_updated_at TIMESTAMPTZ,
  ai_tags TEXT[],
  best_for TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  suspected_closed BOOLEAN NOT NULL DEFAULT FALSE,
  admin_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refresh_priority INT NOT NULL DEFAULT 5,
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.500,
  freshness_score NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
  engagement_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
  exploration_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
  completeness_score NUMERIC(4, 3) NOT NULL DEFAULT 0.500,
  total_impressions INT NOT NULL DEFAULT 0,
  total_clicks INT NOT NULL DEFAULT 0,
  total_saves INT NOT NULL DEFAULT 0,
  total_shares INT NOT NULL DEFAULT 0,
  bad_experience_count INT NOT NULL DEFAULT 0,
  bad_experience_unique_users INT NOT NULL DEFAULT 0,
  inaccurate_info_count INT NOT NULL DEFAULT 0,
  not_relevant_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_businesses_town ON public.businesses (town_id);
CREATE INDEX idx_businesses_category ON public.businesses (category_id);
CREATE INDEX idx_businesses_status ON public.businesses (status);
CREATE INDEX idx_businesses_location ON public.businesses USING gist (ll_to_earth (lat, lng));
CREATE INDEX idx_businesses_refresh ON public.businesses (last_refreshed_at) WHERE status = 'active';
CREATE INDEX idx_businesses_rating ON public.businesses (google_rating DESC NULLS LAST);
CREATE INDEX idx_businesses_confidence ON public.businesses (confidence_score DESC) WHERE status = 'active';
CREATE INDEX idx_businesses_eligible ON public.businesses (status, suspected_closed, admin_suppressed, confidence_score)
  WHERE status = 'active' AND suspected_closed = FALSE AND admin_suppressed = FALSE;

CREATE TABLE public.business_tags (
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_id, tag_id)
);

CREATE INDEX idx_business_tags_tag ON public.business_tags (tag_id);

CREATE TABLE public.search_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(20) NOT NULL,
  category_id INT REFERENCES public.categories (id),
  town_id INT REFERENCES public.towns (id),
  query_string VARCHAR(500),
  business_id UUID REFERENCES public.businesses (id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 5,
  last_run_at TIMESTAMPTZ,
  next_run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_count INT NOT NULL DEFAULT 0,
  max_runs INT NOT NULL DEFAULT 1,
  results_count INT,
  new_businesses_count INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER search_jobs_updated_at
  BEFORE UPDATE ON public.search_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_search_jobs_pending ON public.search_jobs (priority, next_run_after)
  WHERE status = 'pending';
CREATE INDEX idx_search_jobs_status ON public.search_jobs (status);

CREATE TABLE public.query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  normalized_query VARCHAR(500) NOT NULL,
  raw_queries TEXT[],
  response_json JSONB NOT NULL,
  business_ids UUID[] NOT NULL,
  hit_count INT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_query_cache_hash ON public.query_cache (query_hash);
CREATE INDEX idx_query_cache_expires ON public.query_cache (expires_at);
CREATE INDEX idx_query_cache_hits ON public.query_cache (hit_count DESC);

CREATE TABLE public.user_saves (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, business_id)
);

CREATE INDEX idx_user_saves_user ON public.user_saves (user_id);

CREATE TABLE public.shares (
  id VARCHAR(12) PRIMARY KEY,
  cache_id UUID REFERENCES public.query_cache (id) ON DELETE SET NULL,
  query_snapshot JSONB NOT NULL,
  access_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.impressions (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  query_hash VARCHAR(64),
  rank_position INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impressions_business ON public.impressions (business_id);
CREATE INDEX idx_impressions_created ON public.impressions (created_at);
CREATE INDEX idx_impressions_query ON public.impressions (query_hash);

CREATE TABLE public.interactions (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  interaction_type VARCHAR(20) NOT NULL,
  query_hash VARCHAR(64),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_business ON public.interactions (business_id);
CREATE INDEX idx_interactions_user ON public.interactions (user_id);
CREATE INDEX idx_interactions_type ON public.interactions (interaction_type);
CREATE INDEX idx_interactions_created ON public.interactions (created_at);

CREATE TABLE public.user_feedback (
  id SERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  feedback_type VARCHAR(30) NOT NULL,
  feedback_reason VARCHAR(50),
  query_context VARCHAR(500),
  intent_context JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id, feedback_type)
);

CREATE INDEX idx_user_feedback_business ON public.user_feedback (business_id);
CREATE INDEX idx_user_feedback_user ON public.user_feedback (user_id);
CREATE INDEX idx_user_feedback_type ON public.user_feedback (feedback_type);
CREATE INDEX idx_user_feedback_recent ON public.user_feedback (created_at DESC);

CREATE TABLE public.user_suppressions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  suppression_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, business_id, suppression_type)
);

CREATE INDEX idx_user_suppressions_user ON public.user_suppressions (user_id);

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
