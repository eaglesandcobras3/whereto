-- SEO site audit runs (cron + manual). Apply in Supabase SQL editor.

create table if not exists public.seo_audit_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  base_url text not null,
  urls_crawled int not null default 0,
  urls_total int not null default 0,
  summary jsonb not null default '{}'::jsonb,
  report_markdown text,
  error_message text
);

create table if not exists public.seo_audit_issues (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.seo_audit_runs(id) on delete cascade,
  severity text not null,
  category text not null,
  rule text not null,
  url text,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists seo_audit_runs_started_at_idx on public.seo_audit_runs (started_at desc);
create index if not exists seo_audit_issues_run_id_idx on public.seo_audit_issues (run_id);
create index if not exists seo_audit_issues_severity_idx on public.seo_audit_issues (run_id, severity);

alter table public.seo_audit_runs enable row level security;
alter table public.seo_audit_issues enable row level security;

-- Service role (cron) bypasses RLS. Admins read via service role in server components.
