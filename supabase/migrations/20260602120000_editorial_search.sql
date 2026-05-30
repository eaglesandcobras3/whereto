-- Editorial FTS for Ask Engine: guides (incl. body), towns, areas.

CREATE OR REPLACE FUNCTION public.editorial_plain_text(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(coalesce(raw, ''), '<[^>]*>', ' ', 'g'),
      '[#*_`\[\]()>|]+',
      ' ',
      'g'
    )
  );
$$;

-- Guides: replace narrow search_vector with content-aware index
ALTER TABLE public.guides DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.guides
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
    || setweight(to_tsvector('english', coalesce(search_keywords, '')), 'C')
    || setweight(
      to_tsvector('english', left(public.editorial_plain_text(content), 120000)),
      'C'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS guides_search_vector_idx ON public.guides USING gin (search_vector);

-- Towns
ALTER TABLE public.towns
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('english', coalesce(search_keywords, '')), 'C')
    || setweight(
      to_tsvector('english', left(public.editorial_plain_text(content), 80000)),
      'C'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS towns_search_vector_idx ON public.towns USING gin (search_vector);

-- Areas
ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('english', coalesce(search_keywords, '')), 'C')
    || setweight(
      to_tsvector('english', left(public.editorial_plain_text(content), 80000)),
      'C'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS areas_search_vector_idx ON public.areas USING gin (search_vector);
