-- Static build tables for WhereTo30A
-- Run in Supabase SQL editor (production). Safe to re-run.
--
-- What this does:
--   1. Creates public.content_entries (empty overlay; stops build/sitemap errors)
--   2. Creates public.seo_pages
--   3. Publishes seo_pages rows from existing query_cache data
--
-- What this does NOT do:
--   query_cache rows are built by the app (OpenAI ranking + enrichment).
--   If query_cache is empty, step 3 inserts zero rows — run precompute first,
--   then re-run step 3 only (bottom of this file).
--
-- After running: redeploy on Vercel so generateStaticParams picks up seo_pages.

-- =============================================================================
-- 1. content_entries (optional overlay; guides still read from public.guides)
-- =============================================================================

create table if not exists public.content_entries (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  slug text not null,
  title text not null,
  excerpt text,
  body_markdown text,
  body_rich jsonb not null default '{}'::jsonb,
  custom_fields_json jsonb not null default '{}'::jsonb,
  blocks_json jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  og_image_url text,
  legacy_page_slug text,
  updated_at timestamptz not null default now(),
  unique (content_type, slug)
);

create index if not exists content_entries_type_status_idx
  on public.content_entries (content_type, status);

alter table public.content_entries enable row level security;

-- =============================================================================
-- 2. seo_pages (town intent URLs: /rosemary-beach/coffee, etc.)
-- =============================================================================

create table if not exists public.seo_pages (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  meta_description text,
  content_intro text,
  recommendation_set_id uuid,
  location_scope text not null default 'town',
  town_id integer,
  region_id integer,
  published boolean not null default false,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_pages_town_id_idx on public.seo_pages (town_id);
create index if not exists seo_pages_published_idx on public.seo_pages (published)
  where published = true;

alter table public.seo_pages enable row level security;

-- =============================================================================
-- 3. Publish seo_pages from query_cache (mirrors lib/cron/seo-publish.ts)
-- =============================================================================

create or replace function public.sync_seo_pages_from_query_cache()
returns table (
  upserted bigint,
  scanned bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upserted bigint := 0;
  v_scanned bigint := 0;
begin
  with source as (
    select
      qc.id as recommendation_set_id,
      qc.town_id,
      qc.region_id,
      qc.seo_slug,
      qc.normalized_query,
      qc.response_json,
      t.slug as town_slug,
      coalesce(nullif(trim(t.title), ''), nullif(trim(t.name), ''), t.slug) as town_name
    from public.query_cache qc
    inner join public.towns t on t.id = qc.town_id
    where qc.seo_eligible is true
      and qc.seo_slug is not null
      and qc.town_id is not null
  ),
  shaped as (
    select
      s.town_slug || '/' || s.seo_slug as slug,
      case s.seo_slug
        when 'restaurants' then 'Best restaurants in ' || s.town_name
        when 'coffee' then 'Best coffee in ' || s.town_name
        when 'things-to-do' then 'Things to do in ' || s.town_name
        when 'bars' then 'Best bars in ' || s.town_name
        when 'shopping' then 'Shopping in ' || s.town_name
        when 'brunch' then 'Best brunch in ' || s.town_name
        when 'breakfast' then 'Best breakfast in ' || s.town_name
        when 'lunch' then 'Casual lunch in ' || s.town_name
        when 'dinner' then 'Best dinner in ' || s.town_name
        when 'date-night' then 'Date night in ' || s.town_name
        when 'romantic' then 'Romantic restaurants in ' || s.town_name
        when 'kid-friendly' then 'Kid-friendly restaurants in ' || s.town_name
        when 'pet-friendly' then 'Pet-friendly restaurants in ' || s.town_name
        when 'quick-bites' then 'Quick bites in ' || s.town_name
        when 'live-music' then 'Live music in ' || s.town_name
        when 'outdoor-activities' then 'Outdoor activities in ' || s.town_name
        when 'water-sports' then 'Water sports in ' || s.town_name
        when 'wellness' then 'Wellness & spa in ' || s.town_name
        else left(
          coalesce(nullif(trim(s.normalized_query), ''), 'Top picks in ' || s.town_name),
          120
        )
      end as title,
      left(
        coalesce(
          nullif(trim(s.response_json ->> 'summary'), ''),
          'Local guide to ' || s.town_name || ' on WhereTo30A.'
        ),
        160
      ) as meta_description,
      nullif(trim(s.response_json ->> 'summary'), '') as content_intro,
      s.recommendation_set_id,
      s.town_id,
      s.region_id
    from source s
  ),
  upserted as (
    insert into public.seo_pages (
      slug,
      title,
      meta_description,
      content_intro,
      recommendation_set_id,
      location_scope,
      town_id,
      region_id,
      published,
      last_generated_at,
      updated_at
    )
    select
      sh.slug,
      sh.title,
      sh.meta_description,
      sh.content_intro,
      sh.recommendation_set_id,
      'town',
      sh.town_id,
      sh.region_id,
      true,
      now(),
      now()
    from shaped sh
    on conflict (slug) do update set
      title = excluded.title,
      meta_description = excluded.meta_description,
      content_intro = excluded.content_intro,
      recommendation_set_id = excluded.recommendation_set_id,
      town_id = excluded.town_id,
      region_id = excluded.region_id,
      published = true,
      last_generated_at = now(),
      updated_at = now()
    returning 1
  )
  select count(*)::bigint into v_upserted from upserted;

  select count(*)::bigint into v_scanned
  from public.query_cache qc
  where qc.seo_eligible is true
    and qc.seo_slug is not null
    and qc.town_id is not null;

  return query select v_upserted, v_scanned;
end;
$$;

-- First publish pass
select * from public.sync_seo_pages_from_query_cache();

-- =============================================================================
-- 4. Verify (expect content_entries = 0 unless you backfill; seo_pages > 0 if
--    query_cache already has seo_eligible rows)
-- =============================================================================

select 'content_entries' as table_name, count(*)::bigint as row_count from public.content_entries
union all
select 'seo_pages (published)' as table_name, count(*)::bigint from public.seo_pages where published = true
union all
select 'query_cache (seo_eligible)' as table_name, count(*)::bigint from public.query_cache where seo_eligible is true and seo_slug is not null;

-- Sample intent slugs that will static-generate on next deploy:
select slug, title from public.seo_pages where published = true order by slug limit 20;

-- =============================================================================
-- Re-run only step 3 after new query_cache rows are added:
--   select * from public.sync_seo_pages_from_query_cache();
-- =============================================================================
