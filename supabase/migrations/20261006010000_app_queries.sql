-- Read helpers for the app: a station summary view and map/nearby lookups.

-- Open Charge Map often lists a plug without its power, and guessing would put
-- wrong numbers in front of users.
alter table public.connectors alter column power_kw drop not null;

-- One row per visible station with what the map and lists need. The cheapest
-- casual per-kWh price ignores time-of-day windows, so it is the price anyone
-- can get right now. security_invoker keeps hiding and shadowbans in force.
create view public.station_summaries
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.address,
  s.suburb,
  s.state,
  s.postcode,
  s.access_type,
  s.is_24_7,
  s.access_hours,
  s.parking_fee_note,
  s.payment_methods,
  s.amenities,
  s.location,
  extensions.st_y(s.location::extensions.geometry) as lat,
  extensions.st_x(s.location::extensions.geometry) as lng,
  o.id as operator_id,
  o.name as operator_name,
  o.website as operator_website,
  hw.max_power_kw,
  coalesce(hw.has_dc, false) as has_dc,
  coalesce(hw.connector_types, '{}') as connector_types,
  price.cheapest_kwh,
  price.is_free,
  price.price_seen_at
from public.stations s
left join public.operators o on o.id = s.operator_id
left join lateral (
  select
    max(c.power_kw) as max_power_kw,
    bool_or(c.current_type = 'dc') as has_dc,
    array_agg(distinct c.connector_type) as connector_types
  from public.connectors c
  where c.station_id = s.id
) hw on true
left join lateral (
  select cp.per_kwh as cheapest_kwh, cp.is_free, cp.last_seen_at as price_seen_at
  from public.current_prices cp
  where cp.station_id = s.id
    and cp.tier = 'casual'
    and cp.time_window_start is null
    and (cp.per_kwh is not null or cp.is_free)
  order by cp.is_free desc, cp.per_kwh asc nulls last
  limit 1
) price on true;

-- Stations inside the visible map area.
create function public.stations_in_bbox(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  max_results integer default 500
)
returns setof public.station_summaries
language sql
stable
set search_path = ''
as $$
  select *
  from public.station_summaries
  where location operator(extensions.&&)
    extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography
  limit least(max_results, 1000);
$$;

-- Stations near a point, closest first.
create function public.stations_near(
  lat double precision,
  lng double precision,
  radius_m double precision default 25000,
  max_results integer default 50
)
returns setof public.station_summaries
language sql
stable
set search_path = ''
as $$
  select *
  from public.station_summaries
  where extensions.st_dwithin(
    location,
    extensions.st_point(lng, lat, 4326)::extensions.geography,
    least(radius_m, 200000)
  )
  order by location operator(extensions.<->)
    extensions.st_point(lng, lat, 4326)::extensions.geography
  limit least(max_results, 200);
$$;
