-- Featured content table for curated homepage sections
CREATE TABLE IF NOT EXISTS public.featured_content (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL, -- 'business', 'category', 'town', 'collection'
  reference_id TEXT, -- UUID for businesses, INT as string for categories/towns, NULL for collections
  title TEXT NOT NULL,
  description TEXT,
  badge VARCHAR(50), -- 'EDITOR''S PICK', 'LOCAL FAVORITE', etc.
  metadata JSONB DEFAULT '{}', -- For collections: { businessIds: [...] }
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER featured_content_updated_at
  BEFORE UPDATE ON public.featured_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY featured_content_read_all ON public.featured_content
  FOR SELECT USING (TRUE);

-- Admin write access
CREATE POLICY featured_content_admin_all ON public.featured_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- Indexes
CREATE INDEX idx_featured_content_type ON public.featured_content (content_type);
CREATE INDEX idx_featured_content_active ON public.featured_content (is_active, sort_order);

-- Grants
GRANT SELECT ON public.featured_content TO anon, authenticated;

COMMENT ON TABLE public.featured_content IS 'Curated featured content for homepage sections';
COMMENT ON COLUMN public.featured_content.content_type IS 'Type: business, category, town, collection';
COMMENT ON COLUMN public.featured_content.reference_id IS 'ID of referenced item (UUID for business, INT as string for others)';
COMMENT ON COLUMN public.featured_content.metadata IS 'Additional data, e.g., businessIds for collections';
