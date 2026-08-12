-- Ensure place-center columns for hub maps (`town_maps` feature).
-- Safe to re-run. Does not overwrite existing non-null coordinates.

alter table public.towns
  add column if not exists center_lat double precision,
  add column if not exists center_lng double precision;

alter table public.areas
  add column if not exists latitude_center double precision,
  add column if not exists longitude_center double precision;

comment on column public.towns.center_lat is 'Approximate town center latitude for hub / discovery maps';
comment on column public.towns.center_lng is 'Approximate town center longitude for hub / discovery maps';
comment on column public.areas.latitude_center is 'Approximate area center latitude for hub maps';
comment on column public.areas.longitude_center is 'Approximate area center longitude for hub maps';

-- Seed known 30A corridor towns when coords are missing or still the content-compiler default (30.3, -86.1).
update public.towns set center_lat = 30.282, center_lng = -86.005
where slug = 'inlet-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.278, center_lng = -86.012
where slug = 'rosemary-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.276, center_lng = -86.02
where slug = 'alys-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.321, center_lng = -86.141
where slug = 'seaside'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.318, center_lng = -86.128
where slug = 'watercolor'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.315, center_lng = -86.12
where slug = 'seagrove-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.335, center_lng = -86.165
where slug = 'grayton-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.345, center_lng = -86.175
where slug = 'blue-mountain-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.372, center_lng = -86.228
where slug = 'santa-rosa-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));

update public.towns set center_lat = 30.385, center_lng = -86.245
where slug = 'dune-allen-beach'
  and (center_lat is null or center_lng is null
    or (abs(center_lat - 30.3) < 0.0005 and abs(center_lng - (-86.1)) < 0.0005));
