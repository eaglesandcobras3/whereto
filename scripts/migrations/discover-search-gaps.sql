-- Discover NL: unresolved search terms users typed that don't map to search_tags_vocabulary.
-- Apply in Supabase SQL editor. Service role writes; admins read via /admin/discover-gaps.

create table if not exists public.discover_search_gaps (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  hit_count int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_raw_query text not null,
  last_parsed_category text,
  last_parsed_town text,
  last_parsed_tags text[] not null default '{}',
  last_expanded boolean not null default false,
  status text not null default 'open',
  operator_notes text,
  resolved_tag text,
  constraint discover_search_gaps_term_key unique (term),
  constraint discover_search_gaps_status_check check (status in ('open', 'resolved', 'ignored'))
);

create index if not exists discover_search_gaps_status_last_seen_idx
  on public.discover_search_gaps (status, last_seen_at desc);

create index if not exists discover_search_gaps_hit_count_idx
  on public.discover_search_gaps (hit_count desc);

alter table public.discover_search_gaps enable row level security;

-- No public policies — service role bypasses RLS; admin UI uses service role server-side.
