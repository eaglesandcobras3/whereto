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
