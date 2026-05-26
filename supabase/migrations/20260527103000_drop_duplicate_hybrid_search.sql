-- PostgREST / supabase.rpc cannot disambiguate two seven-argument overloads that share
-- types (text, vector(1536), int, text, text/text[], ...) in different orders.
--
-- Town-adjacency (20260525120000) defined:
--   p_town_id, p_category_id, p_town_ids, p_anchor_town_id  → (_, text, text, text[], text)
--
-- Business intelligence (20260526120000) defined the canonical ordering used by app code:
--   p_town_id, p_town_ids, p_anchor_town_id, p_category_id  → (_, text, text[], text, text)
--
-- Drop ONLY the stale overload (town + category both text before town_ids).
-- Qualify vector's schema when needed (Supabase/pgvector installs vary).

DROP FUNCTION IF EXISTS public.hybrid_search_businesses(
  text,
  public.vector(1536),
  int,
  text,
  text,
  text[],
  text
);

DROP FUNCTION IF EXISTS public.hybrid_search_businesses(
  text,
  extensions.vector(1536),
  int,
  text,
  text,
  text[],
  text
);

DROP FUNCTION IF EXISTS public.hybrid_search_businesses(
  text,
  vector(1536),
  int,
  text,
  text,
  text[],
  text
);
