-- AI enrichment columns for towns
-- Run this in Supabase SQL Editor

ALTER TABLE public.towns
  -- Overview
  ADD COLUMN IF NOT EXISTS ai_tagline TEXT,
  ADD COLUMN IF NOT EXISTS ai_description TEXT,
  ADD COLUMN IF NOT EXISTS ai_vibe TEXT[],
  ADD COLUMN IF NOT EXISTS ai_known_for TEXT[],

  -- Practical Info
  ADD COLUMN IF NOT EXISTS ai_best_for TEXT[],
  ADD COLUMN IF NOT EXISTS ai_not_ideal_for TEXT[],
  ADD COLUMN IF NOT EXISTS ai_best_time_to_visit TEXT[],
  ADD COLUMN IF NOT EXISTS ai_parking_situation TEXT,
  ADD COLUMN IF NOT EXISTS ai_walkability TEXT,

  -- Recommendations
  ADD COLUMN IF NOT EXISTS ai_must_see TEXT[],
  ADD COLUMN IF NOT EXISTS ai_hidden_gems TEXT[],
  ADD COLUMN IF NOT EXISTS ai_local_tips TEXT[],
  ADD COLUMN IF NOT EXISTS ai_food_scene TEXT,
  ADD COLUMN IF NOT EXISTS ai_nightlife TEXT,
  ADD COLUMN IF NOT EXISTS ai_family_activities TEXT[],
  ADD COLUMN IF NOT EXISTS ai_romantic_spots TEXT[],

  -- Nearby
  ADD COLUMN IF NOT EXISTS ai_nearby_towns TEXT[],
  ADD COLUMN IF NOT EXISTS ai_day_trip_ideas TEXT[],

  -- Scores
  ADD COLUMN IF NOT EXISTS ai_family_score INT,
  ADD COLUMN IF NOT EXISTS ai_romance_score INT,
  ADD COLUMN IF NOT EXISTS ai_nightlife_score INT,
  ADD COLUMN IF NOT EXISTS ai_budget_score INT,

  -- Metadata
  ADD COLUMN IF NOT EXISTS ai_enrichment_updated_at TIMESTAMPTZ;

-- Index for finding towns needing enrichment
CREATE INDEX IF NOT EXISTS idx_towns_needs_ai_enrichment
  ON public.towns (ai_enrichment_updated_at)
  WHERE ai_enrichment_updated_at IS NULL;
