-- Make rental marketplace business linkage optional.
-- Partners can apply and list stays without a public directory business profile.

alter table public.rental_partner_profiles
  alter column business_id drop not null;

alter table public.rental_properties
  alter column business_id drop not null;

alter table public.rental_referral_clicks
  alter column business_id drop not null;

-- Optional public display name when no businesses row is linked.
alter table public.rental_partner_profiles
  add column if not exists display_name text;

alter table public.rental_partner_profiles
  add column if not exists show_public_business_profile boolean not null default false;

comment on column public.rental_partner_profiles.business_id is
  'Optional link to a public directory business. Null when the partner does not want a company listing.';
comment on column public.rental_partner_profiles.show_public_business_profile is
  'When true and business_id is set, show Managed-by / portfolio on the public business page.';

-- Recreate the view so new partner columns can be inserted mid-list.
-- CREATE OR REPLACE VIEW cannot rename/reorder existing columns (42P16).
drop view if exists public.rental_properties_view;

create view public.rental_properties_view as
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
  rp.display_name as partner_display_name,
  rp.show_public_business_profile as partner_show_public_business_profile,
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
