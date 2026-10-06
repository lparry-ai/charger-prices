-- Initial schema for ChargerPrices. See docs/data-model.md for the reasoning.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('user', 'moderator', 'admin');
create type public.connector_type as enum ('type2', 'ccs2', 'chademo', 'type1', 'nacs');
create type public.current_type as enum ('ac', 'dc');
create type public.payment_method as enum ('credit_card', 'app', 'rfid', 'plug_and_charge');
create type public.access_type as enum ('public', 'customers', 'restricted');
create type public.station_source as enum ('ocm', 'user');
create type public.price_tier as enum ('casual', 'member', 'subscription');
create type public.charger_status as enum ('working', 'faulty', 'blocked');
create type public.edit_status as enum ('pending', 'applied', 'rejected');
create type public.flag_target as enum ('price_report', 'status_report', 'station');
create type public.flag_reason as enum ('wrong', 'spam', 'offensive', 'duplicate', 'other');

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

-- Public face of a user. Anyone can read it; users can only change their name.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  reputation integer not null default 0,
  created_at timestamptz not null default now()
);

-- Roles and shadowbans. Only moderators can read or write this table, so a
-- shadowbanned user has no way to tell. No row means an ordinary user.
create table public.user_moderation (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.user_role not null default 'user',
  shadowbanned_at timestamptz,
  shadowbanned_by uuid references public.profiles (id),
  shadowban_reason text,
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(new.raw_user_meta_data ->> 'name', 40), ''),
      'user-' || left(new.id::text, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_moderation
    where user_id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

-- Whether content written by `author` should be shown to the current viewer.
-- Shadowbanned authors are visible only to themselves and to moderators.
create function public.author_visible(author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select author is null
    or author = auth.uid()
    or public.is_moderator()
    or not exists (
      select 1 from public.user_moderation
      where user_id = author and shadowbanned_at is not null
    );
$$;

-- Hidden rows stay visible to their author (so a hide looks like nothing
-- happened) and to moderators.
create function public.row_visible(author uuid, hidden_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.author_visible(author)
    and (hidden_at is null or author = auth.uid() or public.is_moderator());
$$;

-- ---------------------------------------------------------------------------
-- Stations and hardware
-- ---------------------------------------------------------------------------

create table public.operators (
  id bigint generated always as identity primary key,
  name text not null unique,
  website text,
  ocm_operator_id integer unique,
  created_at timestamptz not null default now()
);

create table public.stations (
  id bigint generated always as identity primary key,
  operator_id bigint references public.operators (id),
  name text not null,
  address text,
  suburb text,
  state text check (state in ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA')),
  postcode text check (postcode ~ '^[0-9]{4}$'),
  location extensions.geography (point, 4326) not null,
  access_type public.access_type not null default 'public',
  is_24_7 boolean,
  access_hours text,
  parking_fee_note text,
  payment_methods public.payment_method[] not null default '{}',
  amenities text[] not null default '{}',
  source public.station_source not null,
  ocm_id integer unique,
  created_by uuid references public.profiles (id),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((source = 'ocm') = (ocm_id is not null))
);

create index stations_location_idx on public.stations using gist (location);
create index stations_operator_idx on public.stations (operator_id);

-- One row per kind of plug at a station, e.g. "4 x CCS2 at 150 kW".
create table public.connectors (
  id bigint generated always as identity primary key,
  station_id bigint not null references public.stations (id) on delete cascade,
  connector_type public.connector_type not null,
  current_type public.current_type not null,
  power_kw numeric(6, 1) not null check (power_kw > 0),
  quantity smallint not null default 1 check (quantity > 0),
  tethered boolean,
  created_at timestamptz not null default now(),
  unique (station_id, connector_type, power_kw)
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stations_set_updated_at
  before update on public.stations
  for each row execute function public.set_updated_at();

create trigger user_moderation_set_updated_at
  before update on public.user_moderation
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Prices
-- ---------------------------------------------------------------------------

-- One tariff as a user saw it. Reports are never edited, only hidden, so the
-- table doubles as price history. Money is AUD dollars.
create table public.price_reports (
  id bigint generated always as identity primary key,
  station_id bigint not null references public.stations (id) on delete cascade,
  connector_type public.connector_type, -- null: applies to every plug
  reported_by uuid not null default auth.uid() references public.profiles (id),
  observed_at timestamptz not null default now(),
  is_free boolean not null default false,
  per_kwh numeric(8, 4) check (per_kwh >= 0),
  per_minute numeric(8, 4) check (per_minute >= 0),
  session_fee numeric(8, 4) check (session_fee >= 0),
  idle_fee_per_minute numeric(8, 4) check (idle_fee_per_minute >= 0),
  idle_fee_grace_minutes smallint check (idle_fee_grace_minutes >= 0),
  tier public.price_tier not null default 'casual',
  plan_name text,
  time_window_start time,
  time_window_end time,
  days_of_week smallint[] check (days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]), -- ISO, 1 = Monday
  notes text check (char_length(notes) <= 500),
  photo_path text,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  check (is_free or coalesce(per_kwh, per_minute, session_fee) is not null),
  check ((time_window_start is null) = (time_window_end is null)),
  check (observed_at <= created_at + interval '5 minutes')
);

create index price_reports_station_idx on public.price_reports (station_id, observed_at desc);
create index price_reports_reporter_idx on public.price_reports (reported_by);

-- "Still correct" taps. Re-confirming updates confirmed_at.
create table public.price_confirmations (
  report_id bigint not null references public.price_reports (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id),
  confirmed_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- Latest visible report per station and distinct tariff, with the most recent
-- time anyone saw or confirmed it. security_invoker makes RLS (and therefore
-- shadowbans) apply to whoever queries the view.
create view public.current_prices
with (security_invoker = true)
as
select distinct on (
    pr.station_id, pr.tier, coalesce(pr.plan_name, ''), pr.connector_type,
    pr.time_window_start, pr.time_window_end, pr.days_of_week
  )
  pr.*,
  greatest(pr.observed_at, c.last_confirmed_at) as last_seen_at,
  coalesce(c.confirmation_count, 0) as confirmation_count
from public.price_reports pr
left join lateral (
  select max(pc.confirmed_at) as last_confirmed_at, count(*) as confirmation_count
  from public.price_confirmations pc
  where pc.report_id = pr.id
) c on true
order by
  pr.station_id, pr.tier, coalesce(pr.plan_name, ''), pr.connector_type,
  pr.time_window_start, pr.time_window_end, pr.days_of_week,
  pr.observed_at desc, pr.id desc;

-- ---------------------------------------------------------------------------
-- Status, corrections and flags
-- ---------------------------------------------------------------------------

create table public.status_reports (
  id bigint generated always as identity primary key,
  station_id bigint not null references public.stations (id) on delete cascade,
  connector_id bigint references public.connectors (id) on delete cascade,
  status public.charger_status not null,
  notes text check (char_length(notes) <= 500),
  reported_by uuid not null default auth.uid() references public.profiles (id),
  observed_at timestamptz not null default now(),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create index status_reports_station_idx on public.status_reports (station_id, observed_at desc);

-- Suggested changes to a station or its connectors, as a JSON diff.
create table public.station_edits (
  id bigint generated always as identity primary key,
  station_id bigint not null references public.stations (id) on delete cascade,
  proposed_by uuid not null default auth.uid() references public.profiles (id),
  changes jsonb not null check (jsonb_typeof(changes) = 'object'),
  note text check (char_length(note) <= 500),
  status public.edit_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index station_edits_station_idx on public.station_edits (station_id);

create table public.flags (
  id bigint generated always as identity primary key,
  target_type public.flag_target not null,
  target_id bigint not null,
  reason public.flag_reason not null,
  note text check (char_length(note) <= 500),
  flagged_by uuid not null default auth.uid() references public.profiles (id),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, flagged_by)
);

create index flags_open_idx on public.flags (created_at) where resolved_at is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_moderation enable row level security;
alter table public.operators enable row level security;
alter table public.stations enable row level security;
alter table public.connectors enable row level security;
alter table public.price_reports enable row level security;
alter table public.price_confirmations enable row level security;
alter table public.status_reports enable row level security;
alter table public.station_edits enable row level security;
alter table public.flags enable row level security;

-- profiles: public read, users rename themselves, nothing else.
create policy "profiles are public" on public.profiles
  for select using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- user_moderation: moderators only.
create policy "moderators manage moderation" on public.user_moderation
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- operators: public read, moderators write.
create policy "operators are public" on public.operators
  for select using (true);
create policy "moderators manage operators" on public.operators
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- stations: public read (subject to hiding and shadowbans), users add new
-- ones, changes to existing stations go through station_edits.
create policy "stations are visible" on public.stations
  for select using (public.row_visible(created_by, hidden_at));
create policy "users add stations" on public.stations
  for insert to authenticated
  with check (created_by = auth.uid() and source = 'user' and hidden_at is null);
create policy "moderators manage stations" on public.stations
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- connectors: public read, the creator of a user-added station can add its
-- plugs, moderators do the rest.
create policy "connectors are public" on public.connectors
  for select using (true);
create policy "station creators add connectors" on public.connectors
  for insert to authenticated
  with check (exists (
    select 1 from public.stations s
    where s.id = station_id and s.created_by = auth.uid()
  ));
create policy "moderators manage connectors" on public.connectors
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- price_reports
create policy "price reports are visible" on public.price_reports
  for select using (public.row_visible(reported_by, hidden_at));
create policy "users report prices" on public.price_reports
  for insert to authenticated
  with check (reported_by = auth.uid() and hidden_at is null);
create policy "moderators manage price reports" on public.price_reports
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- price_confirmations
create policy "confirmations are visible" on public.price_confirmations
  for select using (public.author_visible(user_id));
create policy "users confirm prices" on public.price_confirmations
  for insert to authenticated with check (user_id = auth.uid());
create policy "users refresh own confirmations" on public.price_confirmations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users remove own confirmations" on public.price_confirmations
  for delete to authenticated using (user_id = auth.uid());

-- status_reports
create policy "status reports are visible" on public.status_reports
  for select using (public.row_visible(reported_by, hidden_at));
create policy "users report status" on public.status_reports
  for insert to authenticated
  with check (reported_by = auth.uid() and hidden_at is null);
create policy "moderators manage status reports" on public.status_reports
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- station_edits
create policy "station edits are visible" on public.station_edits
  for select using (public.author_visible(proposed_by));
create policy "users propose edits" on public.station_edits
  for insert to authenticated
  with check (
    proposed_by = auth.uid() and status = 'pending'
    and reviewed_by is null and reviewed_at is null
  );
create policy "moderators review edits" on public.station_edits
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- flags: private to the flagger and moderators.
create policy "users see own flags" on public.flags
  for select to authenticated using (flagged_by = auth.uid() or public.is_moderator());
create policy "users flag content" on public.flags
  for insert to authenticated
  with check (
    flagged_by = auth.uid()
    and resolved_by is null and resolved_at is null and resolution is null
  );
create policy "moderators resolve flags" on public.flags
  for all to authenticated using (public.is_moderator()) with check (public.is_moderator());
