-- Town intent SEO pages (e.g. `/rosemary-beach/coffee`) backed by `query_cache` rows.
-- When absent, intent routes are not pre-rendered and are omitted from the sitemap.

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
