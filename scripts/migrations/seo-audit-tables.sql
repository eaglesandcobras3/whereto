-- SEO site audit: optional markdown history (apply only if SEO_AUDIT_STORE_REPORTS=1).
-- Issues live in report_markdown only — no separate issues table needed.

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

create index if not exists seo_audit_runs_started_at_idx on public.seo_audit_runs (started_at desc);

alter table public.seo_audit_runs enable row level security;

-- Cron uses service role. Old installs with seo_audit_issues may drop that table manually.
