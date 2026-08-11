-- Vacation rentals marketplace (direct-booking referral layer).
-- Apply via Supabase SQL editor. RLS on; public reads via service role from Next.js.

-- ---------------------------------------------------------------------------
-- Partner profiles (1:1 with managing businesses)
-- ---------------------------------------------------------------------------
create table if not exists public.rental_partner_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  status text not null default 'draft'
    check (status in (
      'draft', 'submitted', 'under_review', 'approved',
      'import_pending', 'active', 'paused', 'rejected'
    )),
  contact_name text,
  contact_email text,
  contact_phone text,
  pms_name text,
  pms_other text,
  booking_engine_base_url text,
  booking_url_template text,
  booking_url_hosts text[] not null default '{}',
  authority_attested_at timestamptz,
  content_rights_attested_at timestamptz,
  import_method text
    check (import_method is null or import_method in ('manual', 'csv', 'ical', 'api')),
  application_payload jsonb,
  admin_notes text,
  approved_at timestamptz,
  approved_by uuid,
  rejected_reason text,
  ical_url text,
  last_availability_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_partner_profiles_business_id_key unique (business_id)
);

create index if not exists rental_partner_profiles_status_idx
  on public.rental_partner_profiles (status);

-- ---------------------------------------------------------------------------
-- Inventory sources
-- ---------------------------------------------------------------------------
create table if not exists public.rental_sources (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.rental_partner_profiles (id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'csv', 'ical', 'api')),
  name text not null,
  config jsonb,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_sources_partner_type_name_key unique (partner_id, source_type, name)
);

create index if not exists rental_sources_partner_id_idx
  on public.rental_sources (partner_id);

-- ---------------------------------------------------------------------------
-- Properties
-- ---------------------------------------------------------------------------
create table if not exists public.rental_properties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  partner_id uuid not null references public.rental_partner_profiles (id) on delete restrict,
  source_id uuid references public.rental_sources (id) on delete set null,
  external_id text,
  slug text not null,
  title text not null,
  description text,
  local_context text,
  excerpt text,
  property_type text not null default 'house'
    check (property_type in (
      'house', 'condo', 'townhome', 'cottage', 'villa', 'apartment', 'other'
    )),
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_review', 'published', 'paused', 'archived', 'removed'
    )),
  town_id uuid references public.towns (id) on delete set null,
  area_id uuid references public.areas (id) on delete set null,
  community_name text,
  bedrooms numeric(3, 1) not null default 1,
  bathrooms numeric(3, 1) not null default 1,
  sleeps integer not null default 2 check (sleeps > 0),
  pets_allowed boolean,
  private_pool boolean,
  gulf_front boolean,
  gulf_view boolean,
  beach_access text
    check (beach_access is null or beach_access in ('none', 'public', 'private', 'unknown')),
  golf_cart_included boolean,
  walkability_notes text,
  parking_notes text,
  rules text,
  starting_nightly_rate numeric(10, 2),
  currency text not null default 'USD',
  pricing_disclaimer text,
  pricing_reliable boolean not null default false,
  booking_url text,
  map_lat double precision,
  map_lng double precision,
  location_precision text not null default 'approximate'
    check (location_precision in ('exact', 'approximate', 'hidden')),
  content_rights_confirmed boolean not null default false,
  duplicate_of_property_id uuid references public.rental_properties (id) on delete set null,
  fingerprint text,
  last_synced_at timestamptz,
  last_sync_status text
    check (last_sync_status is null or last_sync_status in ('ok', 'failed', 'stale', 'never')),
  last_sync_error text,
  removed_from_source_at timestamptz,
  seo_title text,
  seo_description text,
  search_tags text[] not null default '{}',
  search_terms text,
  hero_image_url text,
  sort integer,
  featured boolean not null default false,
  is_hidden_from_search boolean not null default false,
  published_at timestamptz,
  date_created timestamptz not null default now(),
  date_updated timestamptz not null default now(),
  constraint rental_properties_slug_key unique (slug)
);

create unique index if not exists rental_properties_source_external_id_key
  on public.rental_properties (source_id, external_id)
  where source_id is not null and external_id is not null;

create index if not exists rental_properties_status_town_idx
  on public.rental_properties (status, town_id);
create index if not exists rental_properties_business_id_idx
  on public.rental_properties (business_id);
create index if not exists rental_properties_partner_id_idx
  on public.rental_properties (partner_id);
create index if not exists rental_properties_sleeps_idx
  on public.rental_properties (sleeps);
create index if not exists rental_properties_bedrooms_idx
  on public.rental_properties (bedrooms);
create index if not exists rental_properties_property_type_idx
  on public.rental_properties (property_type);
create index if not exists rental_properties_last_synced_at_idx
  on public.rental_properties (last_synced_at);
create index if not exists rental_properties_featured_idx
  on public.rental_properties (featured)
  where featured = true;

-- ---------------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------------
create table if not exists public.rental_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.rental_properties (id) on delete cascade,
  storage_url text not null,
  sort integer not null default 0,
  alt text,
  width integer,
  height integer,
  source_url text,
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rental_images_property_sort_idx
  on public.rental_images (property_id, sort);

-- ---------------------------------------------------------------------------
-- Amenities
-- ---------------------------------------------------------------------------
create table if not exists public.rental_amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  constraint rental_amenities_slug_key unique (slug)
);

create table if not exists public.rental_property_amenities (
  property_id uuid not null references public.rental_properties (id) on delete cascade,
  amenity_id uuid not null references public.rental_amenities (id) on delete cascade,
  value text,
  primary key (property_id, amenity_id)
);

insert into public.rental_amenities (slug, title, sort) values
  ('wifi', 'Wi‑Fi', 10),
  ('kitchen', 'Full kitchen', 20),
  ('washer_dryer', 'Washer & dryer', 30),
  ('hot_tub', 'Hot tub', 40),
  ('elevator', 'Elevator', 50),
  ('ev_charger', 'EV charger', 60),
  ('fireplace', 'Fireplace', 70),
  ('balcony', 'Balcony / porch', 80),
  ('grill', 'Grill', 90),
  ('workspace', 'Workspace', 100)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Rates & availability (Phase 5-ready)
-- ---------------------------------------------------------------------------
create table if not exists public.rental_rates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.rental_properties (id) on delete cascade,
  source_id uuid references public.rental_sources (id) on delete set null,
  start_date date not null,
  end_date date not null,
  nightly_rate numeric(10, 2) not null,
  min_stay integer,
  currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists rental_rates_property_dates_idx
  on public.rental_rates (property_id, start_date, end_date);

create table if not exists public.rental_availability (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.rental_properties (id) on delete cascade,
  source_id uuid references public.rental_sources (id) on delete set null,
  date date not null,
  is_available boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint rental_availability_property_date_key unique (property_id, date)
);

create index if not exists rental_availability_property_date_idx
  on public.rental_availability (property_id, date);

-- ---------------------------------------------------------------------------
-- Import jobs & referral clicks
-- ---------------------------------------------------------------------------
create table if not exists public.rental_import_jobs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.rental_partner_profiles (id) on delete cascade,
  source_id uuid references public.rental_sources (id) on delete set null,
  method text not null check (method in ('manual', 'csv', 'ical', 'api')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'partial')),
  file_path text,
  stats jsonb not null default '{}'::jsonb,
  error_log text,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists rental_import_jobs_partner_idx
  on public.rental_import_jobs (partner_id, created_at desc);

create table if not exists public.rental_referral_clicks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.rental_properties (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  partner_id uuid not null references public.rental_partner_profiles (id) on delete cascade,
  clicked_at timestamptz not null default now(),
  check_in date,
  check_out date,
  guests integer,
  destination_url text not null,
  referrer_path text,
  session_id text,
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text
);

create index if not exists rental_referral_clicks_property_clicked_idx
  on public.rental_referral_clicks (property_id, clicked_at desc);
create index if not exists rental_referral_clicks_business_clicked_idx
  on public.rental_referral_clicks (business_id, clicked_at desc);

-- ---------------------------------------------------------------------------
-- Public view (service-role reads)
-- ---------------------------------------------------------------------------
create or replace view public.rental_properties_view as
select
  p.*,
  t.title as town_title,
  t.slug as town_slug,
  a.title as area_title,
  a.slug as area_slug,
  b.title as business_title,
  b.slug as business_slug,
  b.is_verified as business_is_verified,
  b.website as business_website,
  rp.status as partner_status,
  rp.booking_url_template as partner_booking_url_template,
  rp.booking_engine_base_url as partner_booking_engine_base_url,
  (
    select ri.storage_url
    from public.rental_images ri
    where ri.property_id = p.id
    order by ri.sort asc, ri.created_at asc
    limit 1
  ) as primary_image_url
from public.rental_properties p
left join public.towns t on t.id = p.town_id
left join public.areas a on a.id = p.area_id
left join public.businesses b on b.id = p.business_id
left join public.rental_partner_profiles rp on rp.id = p.partner_id;

-- ---------------------------------------------------------------------------
-- RLS (no anon policies — Next.js service role for public + admin)
-- ---------------------------------------------------------------------------
alter table public.rental_partner_profiles enable row level security;
alter table public.rental_sources enable row level security;
alter table public.rental_properties enable row level security;
alter table public.rental_images enable row level security;
alter table public.rental_amenities enable row level security;
alter table public.rental_property_amenities enable row level security;
alter table public.rental_rates enable row level security;
alter table public.rental_availability enable row level security;
alter table public.rental_import_jobs enable row level security;
alter table public.rental_referral_clicks enable row level security;
