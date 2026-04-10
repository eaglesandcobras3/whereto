-- AI enrichment columns for businesses
-- Run this in Supabase SQL Editor

ALTER TABLE public.businesses
  -- Vibe & Atmosphere
  ADD COLUMN IF NOT EXISTS ai_vibe TEXT[],
  ADD COLUMN IF NOT EXISTS ai_crowd TEXT[],
  ADD COLUMN IF NOT EXISTS ai_noise_level TEXT,

  -- Practical Info
  ADD COLUMN IF NOT EXISTS ai_best_time TEXT[],
  ADD COLUMN IF NOT EXISTS ai_reservations TEXT,
  ADD COLUMN IF NOT EXISTS ai_parking TEXT,
  ADD COLUMN IF NOT EXISTS ai_wait_time TEXT,

  -- Use Cases
  ADD COLUMN IF NOT EXISTS ai_good_for TEXT[],
  ADD COLUMN IF NOT EXISTS ai_not_ideal_for TEXT[],
  ADD COLUMN IF NOT EXISTS ai_pairs_with TEXT[],

  -- Content
  ADD COLUMN IF NOT EXISTS ai_one_liner TEXT,
  ADD COLUMN IF NOT EXISTS ai_local_tip TEXT,
  ADD COLUMN IF NOT EXISTS ai_highlights TEXT[],
  ADD COLUMN IF NOT EXISTS ai_nearby_context TEXT,

  -- Scores (1-5)
  ADD COLUMN IF NOT EXISTS ai_family_score INT,
  ADD COLUMN IF NOT EXISTS ai_date_score INT,
  ADD COLUMN IF NOT EXISTS ai_value_score INT,

  -- Metadata
  ADD COLUMN IF NOT EXISTS ai_reasoning_updated_at TIMESTAMPTZ;

-- Index for finding businesses needing AI enrichment
CREATE INDEX IF NOT EXISTS idx_businesses_needs_ai_reasoning
  ON public.businesses (ai_reasoning_updated_at)
  WHERE ai_reasoning_updated_at IS NULL AND status = 'active';

COMMENT ON COLUMN public.businesses.ai_vibe IS 'Vibe tags: romantic, casual, trendy, cozy, lively, upscale, laid-back, beachy, artsy';
COMMENT ON COLUMN public.businesses.ai_crowd IS 'Who goes: locals, tourists, families, couples, groups, solo';
COMMENT ON COLUMN public.businesses.ai_noise_level IS 'quiet, moderate, lively';
COMMENT ON COLUMN public.businesses.ai_best_time IS 'When to visit: sunset, weekday lunch, Sunday brunch, etc.';
COMMENT ON COLUMN public.businesses.ai_reservations IS 'required, recommended, walk-in friendly';
COMMENT ON COLUMN public.businesses.ai_parking IS 'easy, street parking, valet, bike-friendly, walkable';
COMMENT ON COLUMN public.businesses.ai_wait_time IS 'Typical wait: no wait, 10-15 min, 30+ min peak';
COMMENT ON COLUMN public.businesses.ai_good_for IS 'Use cases: date night, family dinner, quick bite, etc.';
COMMENT ON COLUMN public.businesses.ai_not_ideal_for IS 'When to skip: large groups, quiet conversation, etc.';
COMMENT ON COLUMN public.businesses.ai_pairs_with IS 'Activities to combine: beach day, shopping, sunset walk';
COMMENT ON COLUMN public.businesses.ai_one_liner IS 'Catchy 1-sentence pitch';
COMMENT ON COLUMN public.businesses.ai_local_tip IS 'Insider advice';
COMMENT ON COLUMN public.businesses.ai_highlights IS '2-3 standout features';
COMMENT ON COLUMN public.businesses.ai_nearby_context IS 'What is nearby in that town';
COMMENT ON COLUMN public.businesses.ai_family_score IS 'Family-friendly score 1-5';
COMMENT ON COLUMN public.businesses.ai_date_score IS 'Date night score 1-5';
COMMENT ON COLUMN public.businesses.ai_value_score IS 'Value for money score 1-5';
