-- search_profile: AI-generated concise business summary optimised for semantic search.
-- Used as the embedding source instead of the noisy content blob.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS search_profile text;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS search_profile_updated_at timestamptz;
