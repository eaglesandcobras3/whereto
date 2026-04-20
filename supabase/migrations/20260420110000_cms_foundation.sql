-- CMS foundation: site settings, dynamic field groups, content entries, revisions, media assets.

-- 1) Site settings (global key/value options)
CREATE TABLE IF NOT EXISTS public.site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  setting_category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS site_settings_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_read_public ON public.site_settings;
CREATE POLICY site_settings_read_public
  ON public.site_settings FOR SELECT
  USING (is_public = TRUE);

DROP POLICY IF EXISTS site_settings_admin_all ON public.site_settings;
CREATE POLICY site_settings_admin_all
  ON public.site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

GRANT SELECT ON public.site_settings TO anon, authenticated;

-- 2) Dynamic field groups / definitions (ACF-style)
CREATE TABLE IF NOT EXISTS public.field_groups (
  id BIGSERIAL PRIMARY KEY,
  group_key TEXT NOT NULL UNIQUE,
  group_label TEXT NOT NULL,
  description TEXT,
  applies_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS field_groups_updated_at ON public.field_groups;
CREATE TRIGGER field_groups_updated_at
  BEFORE UPDATE ON public.field_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.field_definitions (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES public.field_groups(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (
    field_type IN (
      'text',
      'textarea',
      'richtext',
      'number',
      'boolean',
      'date',
      'select',
      'image',
      'gallery',
      'relationship',
      'repeater'
    )
  ),
  field_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, field_key)
);

DROP TRIGGER IF EXISTS field_definitions_updated_at ON public.field_definitions;
CREATE TRIGGER field_definitions_updated_at
  BEFORE UPDATE ON public.field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.field_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS field_groups_read_all ON public.field_groups;
CREATE POLICY field_groups_read_all
  ON public.field_groups FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS field_definitions_read_all ON public.field_definitions;
CREATE POLICY field_definitions_read_all
  ON public.field_definitions FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS field_groups_admin_all ON public.field_groups;
CREATE POLICY field_groups_admin_all
  ON public.field_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS field_definitions_admin_all ON public.field_definitions;
CREATE POLICY field_definitions_admin_all
  ON public.field_definitions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

GRANT SELECT ON public.field_groups, public.field_definitions TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_field_groups_active ON public.field_groups (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_field_definitions_group ON public.field_definitions (group_id, sort_order);

-- 3) Content entries (core columns + dynamic payloads)
CREATE TABLE IF NOT EXISTS public.content_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (
    content_type IN (
      'home',
      'page',
      'guide',
      'town',
      'business',
      'area',
      'event',
      'seasonal'
    )
  ),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_markdown TEXT,
  body_rich JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image_url TEXT,
  legacy_page_slug TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(content_type, slug)
);

DROP TRIGGER IF EXISTS content_entries_updated_at ON public.content_entries;
CREATE TRIGGER content_entries_updated_at
  BEFORE UPDATE ON public.content_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.content_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_entries_read_published ON public.content_entries;
CREATE POLICY content_entries_read_published
  ON public.content_entries FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS content_entries_admin_all ON public.content_entries;
CREATE POLICY content_entries_admin_all
  ON public.content_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

GRANT SELECT ON public.content_entries TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_content_entries_type_slug ON public.content_entries (content_type, slug);
CREATE INDEX IF NOT EXISTS idx_content_entries_status_pub ON public.content_entries (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_entries_updated_at ON public.content_entries (updated_at DESC);

-- 4) Content revisions
CREATE TABLE IF NOT EXISTS public.content_revisions (
  id BIGSERIAL PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.content_entries(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entry_id, revision_number)
);

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_revisions_admin_all ON public.content_revisions;
CREATE POLICY content_revisions_admin_all
  ON public.content_revisions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

CREATE INDEX IF NOT EXISTS idx_content_revisions_entry ON public.content_revisions (entry_id, revision_number DESC);

-- 5) Media assets (upload metadata + responsive rendition map)
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  object_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  width INT,
  height INT,
  checksum TEXT,
  variants JSONB NOT NULL DEFAULT '{}'::jsonb,
  alt_text TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bucket, object_path)
);

DROP TRIGGER IF EXISTS media_assets_updated_at ON public.media_assets;
CREATE TRIGGER media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_assets_read_all ON public.media_assets;
CREATE POLICY media_assets_read_all
  ON public.media_assets FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS media_assets_admin_all ON public.media_assets;
CREATE POLICY media_assets_admin_all
  ON public.media_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

GRANT SELECT ON public.media_assets TO anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON public.media_assets (created_at DESC);

-- 6) Storage bucket for CMS media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cms-media',
  'cms-media',
  TRUE,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read cms media" ON storage.objects;
CREATE POLICY "Public read cms media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'cms-media');

DROP POLICY IF EXISTS "Admin write cms media" ON storage.objects;
CREATE POLICY "Admin write cms media"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
  WITH CHECK (
    bucket_id = 'cms-media'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Seed baseline public settings used by homepage
INSERT INTO public.site_settings (setting_key, setting_value, setting_category, description, is_public)
VALUES
  ('home.hero_image_url', '"https://lh3.googleusercontent.com/aida-public/AB6AXuCsXovFV1neXjTq-4mDbgPnbeulhSJTjrnA8HjhYxq8ia7daxCG_LgukxpGv4QFsulirvaswIA6YRwYJFSNId1ug0GSb0xSB5vMk2oIfL018BIDjnqCxf8mngM3LnJVaLLOz3m0qpr65y-xGAT3ZUZZY-fO437YIwlfzKPcpingFhsBIKN7sgwtVTuDefQ2_q6okMXgBEOT4EPmHvjNaVcN3NqSIl8bkXfWsg_h-MxXYQMT-vBNtntZc6L7fARzSUTdkBnVQMREwlc"'::jsonb, 'home', 'Homepage hero background image URL', TRUE),
  ('home.hero_title', '"I''m looking for…"'::jsonb, 'home', 'Homepage hero title', TRUE),
  ('home.hero_subtitle', '"Your local guide to 30A. Search towns, guides, and trusted local picks."'::jsonb, 'home', 'Homepage hero supporting text', TRUE),
  ('home.search_placeholder', '"Search anything on 30A..."'::jsonb, 'home', 'Homepage search input placeholder', TRUE)
ON CONFLICT (setting_key) DO NOTHING;
