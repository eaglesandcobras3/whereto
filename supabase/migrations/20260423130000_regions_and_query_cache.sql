-- Regions (roadmap: primary hub pages + towns.region_id)
-- Edited in Directus; app reads from Supabase only.

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'draft',
  sort integer,
  date_updated timestamptz default now(),
  published_at timestamptz
);

create index if not exists regions_slug_idx on public.regions (slug);
create index if not exists regions_status_idx on public.regions (status);

alter table public.towns
  add column if not exists region_id uuid references public.regions (id) on delete set null;

create index if not exists towns_region_id_idx on public.towns (region_id);

-- Optional first region (emerald coast / 30A). Safe to delete or re-point in Directus.
insert into public.regions (slug, title, status, sort)
values ('30a', 'Scenic Highway 30A', 'published', 0)
on conflict (slug) do nothing;

-- Search / precompute cache (pruned by /api/cron/cache-prune)
create table if not exists public.query_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text,
  query_key text,
  normalized_query text,
  raw_queries jsonb,
  response_json jsonb,
  business_ids jsonb,
  expires_at timestamptz not null,
  hit_count integer default 0,
  last_hit_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists query_cache_expires_at_idx on public.query_cache (expires_at);
create index if not exists query_cache_query_hash_idx on public.query_cache (query_hash);

alter table public.regions enable row level security;

drop policy if exists "regions public read" on public.regions;
create policy "regions public read" on public.regions
  for select
  to anon, authenticated
  using (status in ('published', 'active'));
