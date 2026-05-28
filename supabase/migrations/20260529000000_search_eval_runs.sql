-- Search eval runs: stores LLM-as-judge scores and golden set results for trend tracking.
-- See local/eval-search-llm.ts (production sample judge) and local/eval-search.ts (golden set).

create table if not exists public.search_eval_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_type text not null check (run_type in ('golden', 'llm_judge', 'production_sample')),
  query text not null,
  normalized_query text,
  result_business_ids text[] not null default '{}',
  result_titles text[] not null default '{}',
  judge_score smallint check (judge_score between 1 and 4),
  judge_reasoning text,
  judge_model text,
  impression_id uuid references public.search_impressions(id) on delete set null,
  notes text
);

create index if not exists search_eval_runs_created_at_idx
  on public.search_eval_runs (created_at desc);
create index if not exists search_eval_runs_run_type_idx
  on public.search_eval_runs (run_type, created_at desc);
create index if not exists search_eval_runs_impression_id_idx
  on public.search_eval_runs (impression_id)
  where impression_id is not null;

alter table public.search_eval_runs enable row level security;
