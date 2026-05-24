-- Full-text search for businesses
--
-- Adds a weighted tsvector column to `businesses` so queries like
-- "kid friendly restaurants near Seaside" match properly via
-- websearch_to_tsquery instead of fragile ilike patterns.
--
-- Weight scheme:
--   A  title            (exact name match is highest signal)
--   B  search_keywords  (curated attribute terms, nearly as important)
--   C  excerpt          (editorial description)
--   D  content          (full body, lowest weight)

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger function: rebuild search_vector whenever any source column changes.
CREATE OR REPLACE FUNCTION public.businesses_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.search_keywords, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_search_vector_trigger ON public.businesses;
CREATE TRIGGER businesses_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, search_keywords, excerpt, content
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.businesses_search_vector_update();

-- GIN index for fast full-text lookups.
CREATE INDEX IF NOT EXISTS businesses_search_vector_idx
  ON public.businesses USING gin(search_vector);

-- Backfill all existing rows.
UPDATE public.businesses SET
  search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(search_keywords, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'D');
