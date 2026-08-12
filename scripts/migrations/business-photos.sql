-- Portal / public gallery photos for businesses (pending moderation → approved).
-- Writes to listing hero/main URLs go on `public.businesses` (see businesses-external-image-urls.sql),
-- never via `businesses_view` aliases.

CREATE TABLE IF NOT EXISTS public.business_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  uploaded_by uuid NULL,
  public_url text NOT NULL,
  storage_path text NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  is_hero boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  review_item_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_photos_business_id_idx
  ON public.business_photos (business_id);

CREATE INDEX IF NOT EXISTS business_photos_business_status_idx
  ON public.business_photos (business_id, status);

COMMENT ON TABLE public.business_photos IS
  'Member-uploaded business photos; approve may copy is_hero URL onto businesses.main_image_url/hero_image_url.';
