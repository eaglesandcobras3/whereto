-- Add URL slug words to full-text search vectors (slug is often the only place type terms like "bookstore" appear).
--
-- Requires prior migration 20260524120000_fts_businesses.sql (search_vector column + trigger).
-- Hyphens are turned into spaces before to_tsvector('english', …) so compound slugs tokenize.

CREATE OR REPLACE FUNCTION public.businesses_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.search_keywords, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(regexp_replace(NEW.slug, '-', ' ', 'g'), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_search_vector_trigger ON public.businesses;
CREATE TRIGGER businesses_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, search_keywords, excerpt, content, slug
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.businesses_search_vector_update();

UPDATE public.businesses SET
  search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(search_keywords, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(regexp_replace(slug, '-', ' ', 'g'), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'D');
