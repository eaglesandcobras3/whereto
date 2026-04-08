-- Admin refresh queue for directory cron only (no inline API from admin actions).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS places_refresh_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN public.businesses.places_refresh_requested_at IS 'When set, GET /api/cron/refresh prioritizes Place Details for this row. Cleared after a successful refresh.';

CREATE INDEX IF NOT EXISTS idx_businesses_places_refresh_queue
  ON public.businesses (places_refresh_requested_at)
  WHERE places_refresh_requested_at IS NOT NULL AND status = 'active';
