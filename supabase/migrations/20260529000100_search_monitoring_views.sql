-- Search quality monitoring views.
-- Queryable from the Supabase dashboard or any SQL client.

-- Daily zero-result rate by category
create or replace view public.v_search_zero_result_rate as
select
  date_trunc('day', created_at)::date as day,
  intent_category,
  count(*) as total_searches,
  count(*) filter (where total_results = 0) as zero_result_searches,
  round(
    count(*) filter (where total_results = 0)::numeric / nullif(count(*), 0) * 100,
    1
  ) as zero_result_pct
from public.search_impressions
where created_at > now() - interval '30 days'
group by 1, 2
order by 1 desc, 3 desc;

-- Daily retrieval path mix
create or replace view public.v_search_path_mix as
select
  date_trunc('day', created_at)::date as day,
  retrieval_path,
  count(*) as searches,
  round(avg(total_results), 1) as avg_results,
  round(avg(rpc_row_count), 0) as avg_rpc_rows
from public.search_impressions
where created_at > now() - interval '30 days'
group by 1, 2
order by 1 desc, 3 desc;

-- Top zero-result queries (last 30 days, grouped)
create or replace view public.v_search_top_failing_queries as
select
  normalized_query,
  intent_category,
  count(*) as occurrences,
  max(created_at) as last_seen
from public.search_impressions
where total_results = 0
  and created_at > now() - interval '30 days'
group by 1, 2
order by occurrences desc
limit 100;
