-- Address fields for rental listings (public form + admin).
-- Exact street may be stored; public UI should respect location_precision.

alter table public.rental_properties
  add column if not exists street_address text;

alter table public.rental_properties
  add column if not exists postal_code text;

comment on column public.rental_properties.street_address is
  'Optional street address for ops/review. Public pages should only show exact address when location_precision = exact.';
comment on column public.rental_properties.postal_code is
  'Optional postal/ZIP code for the stay.';
comment on column public.rental_properties.location_precision is
  'exact | approximate | hidden — controls how address/map are shown publicly.';
