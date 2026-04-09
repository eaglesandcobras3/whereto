-- Feature Flags table for conditional UI rendering
CREATE TABLE public.feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY feature_flags_read_all ON public.feature_flags FOR SELECT USING (TRUE);

-- Admin write access
CREATE POLICY feature_flags_admin_all ON public.feature_flags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- Initial seed data
INSERT INTO public.feature_flags (name, enabled, description) VALUES
  ('plan-your-trip', TRUE, 'AI-powered trip planning section on homepage'),
  ('towns', TRUE, 'Neighborhoods/Towns section on homepage'),
  ('events', FALSE, 'Events section (upcoming)'),
  ('newsletter', TRUE, 'Newsletter signup in footer'),
  ('curator', TRUE, 'My Curator Recommendations section on homepage'),
  ('search', TRUE, 'Search/Hero section on homepage'),
  ('categories', TRUE, 'Explore by Category section on homepage'),
  ('claims', TRUE, 'Business claim functionality'),
  ('featured_business', TRUE, 'Featured businesses section on homepage');

-- Grants
GRANT SELECT ON public.feature_flags TO anon, authenticated;
