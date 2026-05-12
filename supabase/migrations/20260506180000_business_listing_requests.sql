-- Queue for public "list my business" submissions. Promote to `businesses` only after operator review
-- (Next admin or Directus). RLS enabled with no grants to anon/authenticated — inserts via service role API only.

CREATE TABLE public.business_listing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT business_listing_requests_status_check
      CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'merged'::text])),

  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  submitter_phone text,

  title text NOT NULL,
  town_id uuid REFERENCES public.towns (id) ON DELETE SET NULL,
  primary_category_id uuid REFERENCES public.business_categories (id) ON DELETE SET NULL,
  address text,
  website text,
  phone text,
  email text,
  description text,
  is_storefront boolean NOT NULL DEFAULT false,
  is_service_business boolean NOT NULL DEFAULT false,
  service_area text,
  map_lat double precision,
  map_lng double precision,

  possible_duplicate_business_ids uuid[] NOT NULL DEFAULT '{}',
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by text,
  resulting_business_id uuid REFERENCES public.businesses (id) ON DELETE SET NULL,

  source_ip text,
  user_agent text,

  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX business_listing_requests_status_date_idx
  ON public.business_listing_requests (status, date_created DESC);

CREATE INDEX business_listing_requests_town_idx
  ON public.business_listing_requests (town_id);

COMMENT ON TABLE public.business_listing_requests IS
  'Public listing requests; approved rows are copied into businesses by operators.';

ALTER TABLE public.business_listing_requests ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS business_listing_requests_touch_date_updated ON public.business_listing_requests;
CREATE TRIGGER business_listing_requests_touch_date_updated
  BEFORE UPDATE ON public.business_listing_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_date_updated_to_now();
