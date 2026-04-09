-- Add AI reasoning columns to businesses table
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS ai_vibe TEXT[],
  ADD COLUMN IF NOT EXISTS ai_good_for TEXT[],
  ADD COLUMN IF NOT EXISTS ai_nearby_context TEXT,
  ADD COLUMN IF NOT EXISTS ai_reasoning_updated_at TIMESTAMPTZ;

-- Index for finding businesses needing AI enrichment
CREATE INDEX IF NOT EXISTS idx_businesses_needs_ai_reasoning
  ON public.businesses (ai_reasoning_updated_at)
  WHERE ai_reasoning_updated_at IS NULL AND status = 'active';

COMMENT ON COLUMN public.businesses.ai_vibe IS 'AI-generated vibe tags like "romantic", "family-friendly", "casual"';
COMMENT ON COLUMN public.businesses.ai_good_for IS 'AI-generated use cases like "date night", "business lunch", "kids birthday"';
COMMENT ON COLUMN public.businesses.ai_nearby_context IS 'AI-generated description of what is nearby and activities to pair with';
COMMENT ON COLUMN public.businesses.ai_reasoning_updated_at IS 'When AI reasoning was last generated';
