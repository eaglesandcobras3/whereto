-- Search learning loop: impressions, clicks, aggregated cluster×business stats.
-- See docs/search-learning-loop.md

create table if not exists public.search_impressions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  user_id uuid references auth.users (id) on delete set null,
  raw_query text not null,
  normalized_query text not null,
  query_hash text not null,
  cluster_key text not null,
  intent_category text,
  resolved_category_slugs text[] default '{}',
  town_ids text[] default '{}',
  retrieval_path text not null,
  attempted_paths text[] default '{}',
  total_results integer not null default 0,
  rpc_row_count integer,
  after_post_rank_strict integer,
  after_post_rank_relaxed integer,
  after_sidebar_filters integer,
  top_business_ids uuid[] default '{}',
  top_ranks smallint[] default '{}',
  app_git_sha text
);

create index if not exists search_impressions_created_at_idx
  on public.search_impressions (created_at desc);
create index if not exists search_impressions_cluster_key_idx
  on public.search_impressions (cluster_key);
create index if not exists search_impressions_query_hash_idx
  on public.search_impressions (query_hash);

create table if not exists public.search_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  impression_id uuid not null references public.search_impressions (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  rank smallint not null check (rank >= 1),
  session_id text,
  user_id uuid references auth.users (id) on delete set null
);

create index if not exists search_clicks_impression_id_idx
  on public.search_clicks (impression_id);
create index if not exists search_clicks_business_id_idx
  on public.search_clicks (business_id);
create index if not exists search_clicks_created_at_idx
  on public.search_clicks (created_at desc);

-- Aggregated (cluster_key, business_id) CTR priors for ranking boost. Refreshed by cron or SQL.
create table if not exists public.search_cluster_business_stats (
  cluster_key text not null,
  business_id uuid not null references public.businesses (id) on delete cascade,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (cluster_key, business_id)
);

create index if not exists search_cluster_business_stats_cluster_idx
  on public.search_cluster_business_stats (cluster_key);

-- Service role only — no public read/write policies.
alter table public.search_impressions enable row level security;
alter table public.search_clicks enable row level security;
alter table public.search_cluster_business_stats enable row level security;

-- Rebuild stats from raw tables (last N days). Run on schedule, e.g. hourly cron.
create or replace function public.refresh_search_cluster_business_stats(p_since interval default interval '30 days')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.search_cluster_business_stats;

  insert into public.search_cluster_business_stats (cluster_key, business_id, impressions, clicks, updated_at)
  with imp as (
    select
      si.cluster_key,
      unnest(si.top_business_ids) as business_id
    from public.search_impressions si
    where si.created_at > now() - p_since
  ),
  imp_counts as (
    select cluster_key, business_id, count(*)::bigint as impressions
    from imp
    group by 1, 2
  ),
  clk_counts as (
    select
      si.cluster_key,
      sc.business_id,
      count(*)::bigint as clicks
    from public.search_clicks sc
    join public.search_impressions si on si.id = sc.impression_id
    where sc.created_at > now() - p_since
    group by 1, 2
  )
  select
    coalesce(i.cluster_key, c.cluster_key) as cluster_key,
    coalesce(i.business_id, c.business_id) as business_id,
    coalesce(i.impressions, 0) as impressions,
    coalesce(c.clicks, 0) as clicks,
    now() as updated_at
  from imp_counts i
  full outer join clk_counts c
    on i.cluster_key = c.cluster_key and i.business_id = c.business_id;
end;
$$;
