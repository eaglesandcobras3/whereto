-- Index Readiness Scoring Engine (IRSE) + GSC URL Inspection cache.
-- Apply in Supabase SQL editor. Service role / admin APIs write; RLS enabled with no public policies.

create table if not exists public.irse_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  slug text not null,
  path text not null,
  overall_score numeric not null,
  scores jsonb not null default '{}'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  confidence numeric,
  band text,
  index_ready boolean,
  scored_at timestamptz not null default now()
);

create index if not exists irse_score_snapshots_kind_slug_scored_at_idx
  on public.irse_score_snapshots (kind, slug, scored_at desc);

create index if not exists irse_score_snapshots_scored_at_idx
  on public.irse_score_snapshots (scored_at desc);

create table if not exists public.gsc_url_inspections (
  url text primary key,
  indexed boolean,
  coverage_state text,
  raw jsonb not null default '{}'::jsonb,
  inspected_at timestamptz not null default now()
);

create index if not exists gsc_url_inspections_inspected_at_idx
  on public.gsc_url_inspections (inspected_at desc);

create index if not exists gsc_url_inspections_indexed_idx
  on public.gsc_url_inspections (indexed);

alter table public.irse_score_snapshots enable row level security;
alter table public.gsc_url_inspections enable row level security;

-- Latest score per (kind, slug) for calibration reports.
create or replace view public.irse_latest_scores as
select distinct on (kind, slug)
  kind,
  slug,
  path,
  overall_score,
  scores,
  flags,
  recommendations,
  confidence,
  band,
  index_ready,
  scored_at
from public.irse_score_snapshots
order by kind, slug, scored_at desc;
