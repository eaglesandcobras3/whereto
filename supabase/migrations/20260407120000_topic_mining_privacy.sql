-- Privacy-safe topic mining: aggregates only (see docs/DESIGN-PRIVACY-SAFE-HTML-TOPIC-MINING.md)

-- ---------------------------------------------------------------------------
-- Mining run audit: counts & timing only — no raw HTML or text
-- ---------------------------------------------------------------------------
CREATE TABLE public.mining_run_audit (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  source_type VARCHAR(80) NOT NULL,
  region_id INT REFERENCES public.regions (id) ON DELETE SET NULL,
  town_bias VARCHAR(100),
  input_bytes INT NOT NULL DEFAULT 0,
  candidates_upserted INT NOT NULL DEFAULT 0,
  candidates_below_threshold INT NOT NULL DEFAULT 0,
  duration_ms INT,
  error_code VARCHAR(80)
);

CREATE INDEX idx_mining_run_audit_created ON public.mining_run_audit (created_at DESC);

-- ---------------------------------------------------------------------------
-- Category candidates: aggregated signals only
-- ---------------------------------------------------------------------------
CREATE TABLE public.category_candidates (
  id BIGSERIAL PRIMARY KEY,
  normalized_category VARCHAR(160) NOT NULL,
  category_type VARCHAR(50) NOT NULL,
  intent_type VARCHAR(80),
  frequency INT NOT NULL DEFAULT 0,
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.500,
  local_relevance_score NUMERIC(4, 3) NOT NULL DEFAULT 0.500,
  source_type VARCHAR(80) NOT NULL,
  region_id INT REFERENCES public.regions (id) ON DELETE SET NULL,
  town_bias VARCHAR(100),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suppressed')),
  approved_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes_internal VARCHAR(500),
  dedupe_key VARCHAR(128) NOT NULL UNIQUE
);

CREATE INDEX idx_category_candidates_status ON public.category_candidates (approval_status);
CREATE INDEX idx_category_candidates_last_seen ON public.category_candidates (last_seen_at DESC);

-- ---------------------------------------------------------------------------
-- Build queue: approved candidates only — no auto-publish to categories
-- ---------------------------------------------------------------------------
CREATE TABLE public.category_build_queue (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES public.category_candidates (id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 5,
  suggested_slug VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'in_progress', 'done', 'cancelled')),
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  UNIQUE (candidate_id)
);

CREATE TRIGGER category_build_queue_updated_at
  BEFORE UPDATE ON public.category_build_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_category_build_queue_status ON public.category_build_queue (status);

-- ---------------------------------------------------------------------------
-- RLS: no direct client reads/writes; server uses service role
-- ---------------------------------------------------------------------------
ALTER TABLE public.mining_run_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_build_queue ENABLE ROW LEVEL SECURITY;

-- No policies: anon/authenticated have no access; app uses service role (bypasses RLS).
