-- Phase 3: collections, business claims MVP, share referrer host, scoring prep

-- ---------------------------------------------------------------------------
-- Saved collections (user-owned)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_collections (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_collections_user ON public.user_collections (user_id);

ALTER TABLE public.user_saves
  ADD COLUMN IF NOT EXISTS collection_id INT REFERENCES public.user_collections (id) ON DELETE SET NULL;

CREATE INDEX idx_user_saves_collection ON public.user_saves (collection_id);

ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_collections_select_own ON public.user_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_collections_insert_own ON public.user_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_collections_update_own ON public.user_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY user_collections_delete_own ON public.user_collections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY user_saves_update_own ON public.user_saves FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_collections TO authenticated;
GRANT UPDATE ON public.user_saves TO authenticated;

-- ---------------------------------------------------------------------------
-- Business claim requests (admin reviews; no auto-verify)
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_claim_requests (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  claimant_note VARCHAR(500),
  admin_note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_business_claim_one_pending
  ON public.business_claim_requests (business_id, user_id)
  WHERE status = 'pending';

CREATE INDEX idx_business_claim_requests_status ON public.business_claim_requests (status);
CREATE INDEX idx_business_claim_requests_business ON public.business_claim_requests (business_id);

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS claim_status VARCHAR(20) NOT NULL DEFAULT 'unclaimed'
    CHECK (claim_status IN ('unclaimed', 'pending_review', 'claimed'));

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.business_claim_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_claim_requests_select_own ON public.business_claim_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY business_claim_requests_insert_own ON public.business_claim_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.business_claim_requests TO authenticated;

-- ---------------------------------------------------------------------------
-- Share link referrer (hostname only, for coarse analytics)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shares
  ADD COLUMN IF NOT EXISTS last_referrer_host VARCHAR(200);

-- ---------------------------------------------------------------------------
-- Optional: interaction type already supports metadata; no schema change required
-- ---------------------------------------------------------------------------
