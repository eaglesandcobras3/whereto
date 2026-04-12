-- ============================================================
-- ENTITY GRAPH SCHEMA MIGRATION
-- Markdown-first content platform with structured graph
-- ============================================================

-- ============================================================
-- PART 1: CORE ENTITIES TABLE
-- Universal registry for all content objects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'business', 'town', 'beach', 'area', 'guide',
    'seasonal_guide', 'shopping_area', 'attraction'
  )),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  primary_town_id INT REFERENCES public.towns(id) ON DELETE SET NULL,
  region_id INT REFERENCES public.regions(id) ON DELETE SET NULL,
  excerpt TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_entities_type ON public.entities (entity_type);
CREATE INDEX idx_entities_status ON public.entities (status);
CREATE INDEX idx_entities_slug ON public.entities (slug);
CREATE INDEX idx_entities_town ON public.entities (primary_town_id) WHERE primary_town_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY entities_read_published ON public.entities
  FOR SELECT USING (status = 'published' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

CREATE POLICY entities_admin_all ON public.entities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

GRANT SELECT ON public.entities TO anon, authenticated;


-- ============================================================
-- PART 2: BEACHES TABLE (new entity subtype)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.beaches (
  id SERIAL PRIMARY KEY,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  town_id INT REFERENCES public.towns(id) ON DELETE SET NULL,
  area_id INT, -- Will reference areas table
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  access_notes TEXT,
  parking_notes TEXT,
  amenities TEXT[],
  family_friendly_score INT CHECK (family_friendly_score >= 1 AND family_friendly_score <= 10),
  crowd_level TEXT CHECK (crowd_level IN ('quiet', 'moderate', 'busy', 'very_busy')),
  best_for TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beaches_town ON public.beaches (town_id);
CREATE INDEX idx_beaches_entity ON public.beaches (entity_id);

CREATE TRIGGER beaches_updated_at
  BEFORE UPDATE ON public.beaches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.beaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY beaches_read_all ON public.beaches FOR SELECT USING (TRUE);
CREATE POLICY beaches_admin_all ON public.beaches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.beaches TO anon, authenticated;


-- ============================================================
-- PART 3: AREAS TABLE (shopping areas, districts, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.areas (
  id SERIAL PRIMARY KEY,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  town_id INT REFERENCES public.towns(id) ON DELETE SET NULL,
  area_type TEXT NOT NULL CHECK (area_type IN (
    'shopping_area', 'district', 'square', 'development', 'neighborhood'
  )),
  latitude_center DECIMAL(10, 7),
  longitude_center DECIMAL(10, 7),
  description_short TEXT,
  walkability_score INT CHECK (walkability_score >= 1 AND walkability_score <= 10),
  parking_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_areas_town ON public.areas (town_id);
CREATE INDEX idx_areas_type ON public.areas (area_type);
CREATE INDEX idx_areas_entity ON public.areas (entity_id);

CREATE TRIGGER areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY areas_read_all ON public.areas FOR SELECT USING (TRUE);
CREATE POLICY areas_admin_all ON public.areas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.areas TO anon, authenticated;

-- Add area_id FK to beaches now that areas exists
ALTER TABLE public.beaches
  ADD CONSTRAINT beaches_area_fk FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


-- ============================================================
-- PART 4: GUIDES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.guides (
  id SERIAL PRIMARY KEY,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  guide_type TEXT NOT NULL CHECK (guide_type IN (
    'town', 'intent', 'category', 'seasonal', 'editorial', 'best_of', 'itinerary'
  )),
  primary_topic TEXT,
  primary_town_id INT REFERENCES public.towns(id) ON DELETE SET NULL,
  primary_area_id INT REFERENCES public.areas(id) ON DELETE SET NULL,
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'year_round')),
  seo_priority INT DEFAULT 50,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guides_type ON public.guides (guide_type);
CREATE INDEX idx_guides_town ON public.guides (primary_town_id);
CREATE INDEX idx_guides_entity ON public.guides (entity_id);
CREATE INDEX idx_guides_featured ON public.guides (featured) WHERE featured = TRUE;

CREATE TRIGGER guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY guides_read_all ON public.guides FOR SELECT USING (TRUE);
CREATE POLICY guides_admin_all ON public.guides FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.guides TO anon, authenticated;


-- ============================================================
-- PART 5: PAGES TABLE (markdown content registry)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL CHECK (page_type IN (
    'business', 'town', 'beach', 'area', 'guide', 'landing', 'editorial'
  )),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  markdown_path TEXT, -- path in content folder
  body_markdown TEXT,
  body_html TEXT,
  excerpt TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content_hash TEXT, -- for change detection
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_pages_entity ON public.pages (entity_id);
CREATE INDEX idx_pages_type ON public.pages (page_type);
CREATE INDEX idx_pages_status ON public.pages (status);
CREATE INDEX idx_pages_slug ON public.pages (slug);

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY pages_read_published ON public.pages
  FOR SELECT USING (status = 'published' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

CREATE POLICY pages_admin_all ON public.pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

GRANT SELECT ON public.pages TO anon, authenticated;


-- ============================================================
-- PART 6: PAGE_ENTITIES (page-to-entity relationships)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_entities (
  id SERIAL PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'featured', 'related', 'mentioned', 'primary_topic',
    'nearby', 'secondary_topic', 'recommended'
  )),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_id, entity_id, relationship_type)
);

CREATE INDEX idx_page_entities_page ON public.page_entities (page_id);
CREATE INDEX idx_page_entities_entity ON public.page_entities (entity_id);
CREATE INDEX idx_page_entities_type ON public.page_entities (relationship_type);

ALTER TABLE public.page_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY page_entities_read_all ON public.page_entities FOR SELECT USING (TRUE);
CREATE POLICY page_entities_admin_all ON public.page_entities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.page_entities TO anon, authenticated;


-- ============================================================
-- PART 7: PAGE_LINKS (page-to-page graph)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_links (
  id SERIAL PRIMARY KEY,
  source_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN (
    'body_link', 'related_page', 'auto_suggested', 'seo_internal', 'nav_link'
  )),
  anchor_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_page_id, target_page_id, link_type)
);

CREATE INDEX idx_page_links_source ON public.page_links (source_page_id);
CREATE INDEX idx_page_links_target ON public.page_links (target_page_id);

ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY page_links_read_all ON public.page_links FOR SELECT USING (TRUE);
CREATE POLICY page_links_admin_all ON public.page_links FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.page_links TO anon, authenticated;


-- ============================================================
-- PART 8: SEARCH_DOCUMENTS (flattened search index)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.search_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('entity', 'page', 'business', 'guide')),
  source_id UUID NOT NULL,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  town_slug TEXT,
  page_type TEXT,
  entity_type TEXT,
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  searchable_text TEXT NOT NULL,
  excerpt TEXT,
  weight_base DECIMAL(5, 2) DEFAULT 1.0,
  boost_score DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX idx_search_docs_fts ON public.search_documents
  USING gin(to_tsvector('english', searchable_text));
CREATE INDEX idx_search_docs_title ON public.search_documents
  USING gin(to_tsvector('english', title));
CREATE INDEX idx_search_docs_tags ON public.search_documents USING gin(tags);
CREATE INDEX idx_search_docs_type ON public.search_documents (source_type, entity_type);
CREATE INDEX idx_search_docs_town ON public.search_documents (town_slug) WHERE town_slug IS NOT NULL;

CREATE TRIGGER search_documents_updated_at
  BEFORE UPDATE ON public.search_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.search_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY search_documents_read_all ON public.search_documents FOR SELECT USING (TRUE);
CREATE POLICY search_documents_admin_all ON public.search_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.search_documents TO anon, authenticated;


-- ============================================================
-- PART 9: MEDIA_ASSETS (photos and media)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document')),
  storage_path TEXT, -- Supabase storage path
  external_url TEXT, -- or external URL
  source_type TEXT NOT NULL CHECK (source_type IN (
    'owner_uploaded', 'platform_captured', 'licensed',
    'commons', 'mapillary', 'editorial', 'user_contributed'
  )),
  alt_text TEXT,
  caption TEXT,
  attribution_text TEXT,
  license_type TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  approved_for_display BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  width INT,
  height INT,
  file_size_bytes INT,
  blurhash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_assets_entity ON public.media_assets (entity_id);
CREATE INDEX idx_media_assets_primary ON public.media_assets (entity_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_media_assets_approved ON public.media_assets (approved_for_display) WHERE approved_for_display = TRUE;

CREATE TRIGGER media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_assets_read_approved ON public.media_assets
  FOR SELECT USING (approved_for_display = TRUE OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));
CREATE POLICY media_assets_admin_all ON public.media_assets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.media_assets TO anon, authenticated;


-- ============================================================
-- PART 10: REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_type TEXT NOT NULL CHECK (review_type IN (
    'business_review', 'location_review', 'beach_review', 'guide_feedback'
  )),
  overall_score INT CHECK (overall_score >= 1 AND overall_score <= 5),
  recommendation_score INT CHECK (recommendation_score >= 1 AND recommendation_score <= 5),
  service_score INT CHECK (service_score >= 1 AND service_score <= 5),
  vibe_score INT CHECK (vibe_score >= 1 AND vibe_score <= 5),
  value_score INT CHECK (value_score >= 1 AND value_score <= 5),
  family_friendly_score INT CHECK (family_friendly_score >= 1 AND family_friendly_score <= 5),
  text_title TEXT,
  text_body TEXT,
  visit_date DATE,
  is_public BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_notes TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_entity ON public.reviews (entity_id);
CREATE INDEX idx_reviews_user ON public.reviews (user_id);
CREATE INDEX idx_reviews_status ON public.reviews (moderation_status);
CREATE INDEX idx_reviews_public ON public.reviews (entity_id, is_public) WHERE is_public = TRUE AND moderation_status = 'approved';

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_read_approved ON public.reviews
  FOR SELECT USING (
    (is_public = TRUE AND moderation_status = 'approved')
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY reviews_insert_auth ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

GRANT SELECT, INSERT ON public.reviews TO authenticated;


-- ============================================================
-- PART 11: RECOMMENDATION_FEEDBACK (private signals)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'saved', 'recommended', 'not_for_me', 'bad_experience',
    'inaccurate_info', 'hide_for_me', 'visited', 'helpful', 'not_helpful'
  )),
  context_query TEXT,
  context_page_slug TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rec_feedback_entity ON public.recommendation_feedback (entity_id);
CREATE INDEX idx_rec_feedback_user ON public.recommendation_feedback (user_id);
CREATE INDEX idx_rec_feedback_type ON public.recommendation_feedback (feedback_type);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY rec_feedback_read_own ON public.recommendation_feedback
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY rec_feedback_insert ON public.recommendation_feedback
  FOR INSERT WITH CHECK (TRUE); -- Allow anonymous feedback with session_id

GRANT SELECT, INSERT ON public.recommendation_feedback TO anon, authenticated;


-- ============================================================
-- PART 12: RECOMMENDATION_SCORES (cached scoring)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recommendation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE UNIQUE,
  score_overall DECIMAL(5, 3) DEFAULT 0,
  score_quality DECIMAL(5, 3) DEFAULT 0,
  score_confidence DECIMAL(5, 3) DEFAULT 0,
  score_engagement DECIMAL(5, 3) DEFAULT 0,
  score_recency DECIMAL(5, 3) DEFAULT 0,
  score_editorial DECIMAL(5, 3) DEFAULT 0,
  score_review_weight DECIMAL(5, 3) DEFAULT 0,
  positive_signals INT DEFAULT 0,
  negative_signals INT DEFAULT 0,
  review_count INT DEFAULT 0,
  avg_review_score DECIMAL(3, 2),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rec_scores_entity ON public.recommendation_scores (entity_id);
CREATE INDEX idx_rec_scores_overall ON public.recommendation_scores (score_overall DESC);

ALTER TABLE public.recommendation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY rec_scores_read_all ON public.recommendation_scores FOR SELECT USING (TRUE);
CREATE POLICY rec_scores_admin_all ON public.recommendation_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);
GRANT SELECT ON public.recommendation_scores TO anon, authenticated;


-- ============================================================
-- PART 13: CONTENT_OPPORTUNITIES (missing links/pages)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.content_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  suggested_slug TEXT NOT NULL,
  suggested_type TEXT NOT NULL,
  suggested_title TEXT,
  reason TEXT,
  confidence_score DECIMAL(3, 2) DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'generated', 'deferred'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_content_opps_status ON public.content_opportunities (status);
CREATE INDEX idx_content_opps_slug ON public.content_opportunities (suggested_slug);

ALTER TABLE public.content_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_opps_admin_all ON public.content_opportunities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
);


-- ============================================================
-- PART 14: ADD ENTITY_ID TO EXISTING TABLES
-- ============================================================

-- Add entity_id to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_entity ON public.businesses (entity_id);

-- Add entity_id to towns
ALTER TABLE public.towns
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_towns_entity ON public.towns (entity_id);

-- Add area_id to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS area_id INT REFERENCES public.areas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_area ON public.businesses (area_id);


-- ============================================================
-- PART 15: HELPER FUNCTIONS
-- ============================================================

-- Function to calculate recommendation score for an entity
CREATE OR REPLACE FUNCTION calculate_recommendation_score(p_entity_id UUID)
RETURNS DECIMAL(5, 3) AS $$
DECLARE
  v_score DECIMAL(5, 3);
  v_positive INT;
  v_negative INT;
  v_review_avg DECIMAL(3, 2);
  v_review_count INT;
BEGIN
  -- Count positive signals
  SELECT COUNT(*) INTO v_positive
  FROM public.recommendation_feedback
  WHERE entity_id = p_entity_id
    AND feedback_type IN ('saved', 'recommended', 'visited', 'helpful');

  -- Count negative signals
  SELECT COUNT(*) INTO v_negative
  FROM public.recommendation_feedback
  WHERE entity_id = p_entity_id
    AND feedback_type IN ('not_for_me', 'bad_experience', 'hide_for_me', 'not_helpful');

  -- Get review stats
  SELECT COUNT(*), AVG(overall_score)
  INTO v_review_count, v_review_avg
  FROM public.reviews
  WHERE entity_id = p_entity_id
    AND moderation_status = 'approved'
    AND overall_score IS NOT NULL;

  -- Calculate composite score (0-1 scale)
  v_score := LEAST(1.0, GREATEST(0.0,
    0.5 -- base score
    + (v_positive * 0.02) -- positive boost
    - (v_negative * 0.05) -- negative penalty
    + (COALESCE(v_review_avg, 3) - 3) * 0.1 -- review adjustment
    + LEAST(v_review_count * 0.01, 0.1) -- review volume bonus
  ));

  -- Upsert score record
  INSERT INTO public.recommendation_scores (
    entity_id, score_overall, positive_signals, negative_signals,
    review_count, avg_review_score, calculated_at
  ) VALUES (
    p_entity_id, v_score, v_positive, v_negative,
    v_review_count, v_review_avg, NOW()
  )
  ON CONFLICT (entity_id) DO UPDATE SET
    score_overall = EXCLUDED.score_overall,
    positive_signals = EXCLUDED.positive_signals,
    negative_signals = EXCLUDED.negative_signals,
    review_count = EXCLUDED.review_count,
    avg_review_score = EXCLUDED.avg_review_score,
    calculated_at = EXCLUDED.calculated_at;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.entities IS 'Universal registry for all content objects (businesses, towns, beaches, areas, guides)';
COMMENT ON TABLE public.pages IS 'Markdown content pages linked to entities';
COMMENT ON TABLE public.page_entities IS 'Relationships between pages and entities they reference';
COMMENT ON TABLE public.page_links IS 'Page-to-page link graph for internal linking';
COMMENT ON TABLE public.search_documents IS 'Flattened search index compiled from pages and entities';
COMMENT ON TABLE public.media_assets IS 'Photos and media files for entities';
COMMENT ON TABLE public.reviews IS 'User reviews for entities';
COMMENT ON TABLE public.recommendation_feedback IS 'Private recommendation signals (saves, hides, etc.)';
COMMENT ON TABLE public.recommendation_scores IS 'Cached recommendation scores for ranking';
COMMENT ON TABLE public.content_opportunities IS 'Missing pages and content suggestions';
COMMENT ON TABLE public.beaches IS 'Beach locations and access information';
COMMENT ON TABLE public.areas IS 'Shopping areas, districts, and neighborhoods';
COMMENT ON TABLE public.guides IS 'Editorial guide pages (town guides, best-of lists, etc.)';
