-- Drop the old 8-parameter hybrid_search_businesses overload left over from
-- 20260529120000_hybrid_search_service_filter.sql.
-- The new 10-parameter version (with p_user_lat / p_user_lng) now supersedes it.
-- Without this drop, Postgres raises "could not choose the best candidate function"
-- when the RPC is called without the geo params (which is the common case).

DROP FUNCTION IF EXISTS public.hybrid_search_businesses(
  text,
  vector(1536),
  int,
  text,
  text[],
  text,
  text,
  boolean
);
