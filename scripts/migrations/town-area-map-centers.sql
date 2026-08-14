-- Canonical place pins: towns + areas use map_lat / map_lng (same as businesses / rentals).
-- Safe to re-run. Copies from legacy center_* / latitude_center columns when map_* is empty.
-- Does not drop legacy columns.

alter table public.towns
  add column if not exists map_lat double precision,
  add column if not exists map_lng double precision;

alter table public.areas
  add column if not exists map_lat double precision,
  add column if not exists map_lng double precision;

-- Keep legacy center columns if present (older hub-map work); no longer written by app code.
alter table public.towns
  add column if not exists center_lat double precision,
  add column if not exists center_lng double precision;

alter table public.areas
  add column if not exists latitude_center double precision,
  add column if not exists longitude_center double precision;

comment on column public.towns.map_lat is 'Town map pin latitude (hub / discovery maps)';
comment on column public.towns.map_lng is 'Town map pin longitude (hub / discovery maps)';
comment on column public.areas.map_lat is 'Area map pin latitude (hub maps)';
comment on column public.areas.map_lng is 'Area map pin longitude (hub maps)';

-- Backfill map_* from legacy center columns when map is missing.
update public.towns
set
  map_lat = center_lat,
  map_lng = center_lng
where (map_lat is null or map_lng is null)
  and center_lat is not null
  and center_lng is not null;

update public.areas
set
  map_lat = latitude_center,
  map_lng = longitude_center
where (map_lat is null or map_lng is null)
  and latitude_center is not null
  and longitude_center is not null;

-- Seed known 30A corridor towns when coords are missing or still the content-compiler default (30.3, -86.1).
update public.towns set map_lat = 30.282, map_lng = -86.005
where slug = 'inlet-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.278, map_lng = -86.012
where slug = 'rosemary-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.276, map_lng = -86.02
where slug = 'alys-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.321, map_lng = -86.141
where slug = 'seaside'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.318, map_lng = -86.128
where slug = 'watercolor'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.315, map_lng = -86.12
where slug = 'seagrove-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.335, map_lng = -86.165
where slug = 'grayton-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.345, map_lng = -86.175
where slug = 'blue-mountain-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.372, map_lng = -86.228
where slug = 'santa-rosa-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));

update public.towns set map_lat = 30.385, map_lng = -86.245
where slug = 'dune-allen-beach'
  and (map_lat is null or map_lng is null
    or (abs(map_lat - 30.3) < 0.0005 and abs(map_lng - (-86.1)) < 0.0005));
