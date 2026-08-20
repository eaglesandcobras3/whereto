/**
 * Admin Gemini seed import queue.
 * Pending rows are submitted from /admin/add-business; Apply runs Gemini verify + insert.
 * Failed verification moves to needs_review (force apply or skip).
 *
 * Run in Supabase SQL editor (or: npx supabase db query --linked -f scripts/migrations/admin-business-seed-queue.sql)
 */

CREATE TABLE IF NOT EXISTS public.admin_business_seed_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  town text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  town_id uuid NULL REFERENCES public.towns (id) ON DELETE SET NULL,
  area_id uuid NULL REFERENCES public.areas (id) ON DELETE SET NULL,
  is_storefront boolean NOT NULL DEFAULT false,
  is_service_business boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'processing',
      'imported',
      'needs_review',
      'skipped',
      'force_imported'
    )),
  audit_status text NULL,
  audit_confidence text NULL,
  audit_notes text NULL,
  enriched jsonb NULL,
  business_id uuid NULL REFERENCES public.businesses (id) ON DELETE SET NULL,
  business_slug text NULL,
  result_reason text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  CONSTRAINT admin_business_seed_queue_type_check
    CHECK (is_storefront OR is_service_business)
);

CREATE INDEX IF NOT EXISTS admin_business_seed_queue_status_created_idx
  ON public.admin_business_seed_queue (status, created_at DESC);

COMMENT ON TABLE public.admin_business_seed_queue IS
  'Admin queue for Gemini-verified new business imports. pending → apply; needs_review → force or skip.';

ALTER TABLE public.admin_business_seed_queue ENABLE ROW LEVEL SECURITY;

-- Service role / server routes only; no direct client policies.
DROP POLICY IF EXISTS admin_business_seed_queue_deny_all ON public.admin_business_seed_queue;
CREATE POLICY admin_business_seed_queue_deny_all
  ON public.admin_business_seed_queue
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
