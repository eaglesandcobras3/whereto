CREATE TABLE public.search_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(20) NOT NULL,
  category_id INT REFERENCES public.categories (id),
  town_id INT REFERENCES public.towns (id),
  query_string VARCHAR(500),
  business_id UUID REFERENCES public.businesses (id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 5,
  last_run_at TIMESTAMPTZ,
  next_run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_count INT NOT NULL DEFAULT 0,
  max_runs INT NOT NULL DEFAULT 1,
  results_count INT,
  new_businesses_count INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER search_jobs_updated_at
  BEFORE UPDATE ON public.search_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_search_jobs_pending ON public.search_jobs (priority, next_run_after)
  WHERE status = 'pending';
CREATE INDEX idx_search_jobs_status ON public.search_jobs (status);

CREATE TABLE public.query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  normalized_query VARCHAR(500) NOT NULL,
  raw_queries TEXT[],
  response_json JSONB NOT NULL,
  business_ids UUID[] NOT NULL,
  hit_count INT NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_query_cache_hash ON public.query_cache (query_hash);
CREATE INDEX idx_query_cache_expires ON public.query_cache (expires_at);
CREATE INDEX idx_query_cache_hits ON public.query_cache (hit_count DESC);

CREATE TABLE public.user_saves (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, business_id)
);

CREATE INDEX idx_user_saves_user ON public.user_saves (user_id);

CREATE TABLE public.shares (
  id VARCHAR(12) PRIMARY KEY,
  cache_id UUID REFERENCES public.query_cache (id) ON DELETE SET NULL,
  query_snapshot JSONB NOT NULL,
  access_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
