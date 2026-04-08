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
  taxonomy_type_hints TEXT[] NOT NULL,
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
  listing_external_key VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  town_id INT REFERENCES public.towns (id),
  category_id INT REFERENCES public.categories (id),
  subcategory_id INT REFERENCES public.subcategories (id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(500),
  listing_rating NUMERIC(2, 1),
  listing_review_count INT NOT NULL DEFAULT 0,
  price_level INT,
  hours_json JSONB,
  legacy_photo_refs TEXT[],
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
CREATE INDEX idx_businesses_listing_rating ON public.businesses (listing_rating DESC NULLS LAST);
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
