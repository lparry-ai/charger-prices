-- Local development data only. Fictional networks and prices around Sydney.
-- Sign in locally as demo@example.com via the magic link in Mailpit
-- (http://127.0.0.1:54324).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-00000000d3e0',
  'authenticated', 'authenticated', 'demo@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"name":"Demo driver"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-00000000d3e0',
  '00000000-0000-0000-0000-00000000d3e0',
  'email',
  '{"sub":"00000000-0000-0000-0000-00000000d3e0","email":"demo@example.com","email_verified":true}',
  now(), now(), now()
);

insert into public.operators (name, website) values
  ('Harbour Charge', 'https://example.com/harbour'),
  ('Volt Co', 'https://example.com/volt'),
  ('Kerbside Power', 'https://example.com/kerbside');

insert into public.stations
  (operator_id, name, address, suburb, state, postcode, location, is_24_7, access_hours, parking_fee_note, payment_methods, amenities, source)
values
  (1, 'Harbour Charge Darling Quarter', '1 Example St', 'Sydney', 'NSW', '2000',
   'SRID=4326;POINT(151.2006 -33.8749)', false, '6am to midnight', 'Carpark fees apply after 1 hour',
   '{credit_card,app}', '{toilets,food}', 'user'),
  (2, 'Volt Co Moore Park', '2 Example Rd', 'Moore Park', 'NSW', '2021',
   'SRID=4326;POINT(151.2213 -33.8935)', true, null, null,
   '{app,rfid}', '{food}', 'user'),
  (3, 'Kerbside Power Glebe Point Rd', '3 Example Rd', 'Glebe', 'NSW', '2037',
   'SRID=4326;POINT(151.1862 -33.8790)', true, null, 'Free street parking, 2 hour limit',
   '{credit_card}', '{}', 'user'),
  (2, 'Volt Co North Sydney', '4 Example Ave', 'North Sydney', 'NSW', '2060',
   'SRID=4326;POINT(151.2070 -33.8396)', true, null, null,
   '{app,credit_card,plug_and_charge}', '{toilets,shelter}', 'user');

insert into public.connectors (station_id, connector_type, current_type, power_kw, quantity, tethered) values
  (1, 'ccs2', 'dc', 150, 4, true),
  (1, 'chademo', 'dc', 50, 1, true),
  (2, 'ccs2', 'dc', 350, 6, true),
  (3, 'type2', 'ac', 22, 2, false),
  (4, 'ccs2', 'dc', 75, 2, true),
  (4, 'type2', 'ac', 7.4, 4, false);

insert into public.price_reports
  (station_id, reported_by, observed_at, per_kwh, session_fee, idle_fee_per_minute, idle_fee_grace_minutes, tier, plan_name, time_window_start, time_window_end, notes)
values
  (1, '00000000-0000-0000-0000-00000000d3e0', now() - interval '3 days', 0.62, null, 1.00, 10, 'casual', null, null, null, null),
  (1, '00000000-0000-0000-0000-00000000d3e0', now() - interval '3 days', 0.55, null, 1.00, 10, 'member', 'Harbour Plus', null, null, null),
  (2, '00000000-0000-0000-0000-00000000d3e0', now() - interval '6 hours', 0.69, 1.00, null, null, 'casual', null, null, null, 'Price shown on the charger screen'),
  (2, '00000000-0000-0000-0000-00000000d3e0', now() - interval '6 hours', 0.45, null, null, null, 'casual', null, '22:00', '06:00', 'Overnight rate'),
  (3, '00000000-0000-0000-0000-00000000d3e0', now() - interval '40 days', 0.35, null, null, null, 'casual', null, null, null, null);

insert into public.status_reports (station_id, status, reported_by, observed_at, notes) values
  (2, 'working', '00000000-0000-0000-0000-00000000d3e0', now() - interval '6 hours', null),
  (4, 'faulty', '00000000-0000-0000-0000-00000000d3e0', now() - interval '1 day', 'One CCS2 plug showing an error');
