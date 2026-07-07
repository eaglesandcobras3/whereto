-- Optional CMS overlay for guides and other editorial content.
-- When absent, the app reads `public.guides` directly and skips content_entries lookups.

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
