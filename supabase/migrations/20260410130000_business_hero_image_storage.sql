-- Cached hero images in Supabase Storage (filled by cron or upload flows; no third-party photo fetches on page views).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_fetched_at TIMESTAMPTZ;

COMMENT ON COLUMN public.businesses.hero_image_url IS 'Public URL of first listing image in Storage (synced via /api/cron/business-images).';
COMMENT ON COLUMN public.businesses.hero_image_fetched_at IS 'When hero_image_url was last written (e.g. Storage sync).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-images',
  'business-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read business images" ON storage.objects;
CREATE POLICY "Public read business images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-images');
