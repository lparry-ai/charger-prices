-- Trust and moderation: rate limits, automatic flags for odd prices,
-- reputation from confirmations, and a controlled way to shadowban.

-- ---------------------------------------------------------------------------
-- Rate limits
-- ---------------------------------------------------------------------------

-- Generic per-user rate limit. Arguments: author column, max rows, window.
-- Moderators are exempt.
create function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_column text := tg_argv[0];
  max_rows integer := tg_argv[1]::integer;
  time_window interval := tg_argv[2]::interval;
  author uuid;
  recent integer;
begin
  author := (to_jsonb(new) ->> author_column)::uuid;
  if author is null or public.is_moderator() then
    return new;
  end if;

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, author_column
  ) into recent using author, time_window;

  if recent >= max_rows then
    raise exception 'rate_limited'
      using hint = format('At most %s per %s. Please try again later.', max_rows, tg_argv[2]);
  end if;
  return new;
end;
$$;

create trigger price_reports_rate_limit
  before insert on public.price_reports
  for each row execute function public.enforce_rate_limit('reported_by', '20', '1 hour');

create trigger status_reports_rate_limit
  before insert on public.status_reports
  for each row execute function public.enforce_rate_limit('reported_by', '30', '1 hour');

create trigger flags_rate_limit
  before insert on public.flags
  for each row execute function public.enforce_rate_limit('flagged_by', '30', '1 day');

create trigger station_edits_rate_limit
  before insert on public.station_edits
  for each row execute function public.enforce_rate_limit('proposed_by', '20', '1 day');

create trigger stations_rate_limit
  before insert on public.stations
  for each row execute function public.enforce_rate_limit('created_by', '10', '1 day');

-- ---------------------------------------------------------------------------
-- Automatic flags
-- ---------------------------------------------------------------------------

-- A null flagged_by marks a flag raised by the system rather than a person.
alter table public.flags alter column flagged_by drop not null;

-- Flags casual per-kWh prices that are implausible on their own, or far from
-- what other drivers have recently reported at the same station. The report
-- still shows; a moderator decides whether to hide it.
create function public.flag_unusual_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  typical numeric;
  others integer;
  reason text;
begin
  if new.is_free or new.per_kwh is null or new.tier <> 'casual' then
    return new;
  end if;

  if new.per_kwh > 1.50 then
    reason := 'Automatic: more than $1.50/kWh';
  elsif new.per_kwh < 0.05 then
    reason := 'Automatic: less than 5c/kWh';
  else
    select percentile_cont(0.5) within group (order by pr.per_kwh), count(*)
      into typical, others
    from public.price_reports pr
    where pr.station_id = new.station_id
      and pr.id <> new.id
      and pr.reported_by <> new.reported_by
      and pr.tier = 'casual'
      and pr.per_kwh is not null
      and pr.hidden_at is null
      and pr.observed_at > now() - interval '90 days'
      and not exists (
        select 1 from public.user_moderation m
        where m.user_id = pr.reported_by and m.shadowbanned_at is not null
      );

    if others >= 2 and abs(new.per_kwh - typical) > typical * 0.5 then
      reason := format('Automatic: far from the usual %sc/kWh here', round(typical * 100, 1));
    end if;
  end if;

  if reason is not null then
    insert into public.flags (target_type, target_id, reason, note, flagged_by)
    values ('price_report', new.id, 'wrong', reason, null);
  end if;
  return new;
end;
$$;

create trigger price_reports_flag_unusual
  after insert on public.price_reports
  for each row execute function public.flag_unusual_price();

-- ---------------------------------------------------------------------------
-- Reputation
-- ---------------------------------------------------------------------------

-- A point for each other driver who confirms one of your prices.
create function public.reward_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select reported_by into author from public.price_reports where id = new.report_id;
  if author is not null and author <> new.user_id and not exists (
    select 1 from public.user_moderation m
    where m.user_id = new.user_id and m.shadowbanned_at is not null
  ) then
    update public.profiles set reputation = reputation + 1 where id = author;
  end if;
  return new;
end;
$$;

create trigger price_confirmations_reward
  after insert on public.price_confirmations
  for each row execute function public.reward_confirmation();

-- ---------------------------------------------------------------------------
-- Shadowbans
-- ---------------------------------------------------------------------------

-- Moderators can read moderation state but change it only through
-- set_shadowban, which stops them banning each other or themselves. Roles are
-- granted by an admin in SQL.
drop policy "moderators manage moderation" on public.user_moderation;
create policy "moderators read moderation" on public.user_moderation
  for select to authenticated using (public.is_moderator());

create function public.set_shadowban(target uuid, banned boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.user_role;
begin
  if not public.is_moderator() then
    raise exception 'not_allowed';
  end if;
  if target = auth.uid() then
    raise exception 'cannot_ban_self';
  end if;

  select role into target_role from public.user_moderation where user_id = target;
  if coalesce(target_role, 'user') <> 'user' then
    raise exception 'cannot_ban_moderator';
  end if;

  insert into public.user_moderation (user_id, shadowbanned_at, shadowbanned_by, shadowban_reason)
  values (
    target,
    case when banned then now() end,
    case when banned then auth.uid() end,
    case when banned then left(reason, 500) end
  )
  on conflict (user_id) do update set
    shadowbanned_at = excluded.shadowbanned_at,
    shadowbanned_by = excluded.shadowbanned_by,
    shadowban_reason = excluded.shadowban_reason;
end;
$$;

revoke execute on function public.set_shadowban(uuid, boolean, text) from public, anon;
grant execute on function public.set_shadowban(uuid, boolean, text) to authenticated;
