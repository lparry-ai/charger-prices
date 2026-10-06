# Data model

ChargerPrices is a community-sourced list of EV charger prices in Australia,
in the spirit of PetrolSpy: users report what a charger costs, everyone else
sees the latest price and how old it is.

The schema lives in `supabase/migrations/`. This document explains the shape
and the decisions behind it.

## Overview

```
operators 1──* stations 1──* connectors
                  │
                  ├──* price_reports 1──* price_confirmations
                  ├──* status_reports
                  └──* station_edits

profiles (one per signed-in user) ── authors every report, edit and flag
flags ── point at a price report, status report or station
```

## Stations and hardware

**operators**: the charging network (Chargefox, Evie, Tesla, NRMA, Ampol
AmpCharge, BP Pulse, ...). Stations point at one operator.

**stations**: a physical site. Most are seeded from
[Open Charge Map](https://openchargemap.org) (`ocm_id`), which already covers
Australia and lists operator, plugs and kW. Users can add missing stations
(`source = 'user'`). Location is a PostGIS `geography(Point)` so "chargers
near me" is a single indexed query.

Site details people care about beyond price:

| Field | Why |
| --- | --- |
| `payment_methods` | Can you tap a credit card, or do you need the app or an RFID card? Stored as a set, since many sites take several. |
| `access_hours`, `is_24_7` | Shopping centre chargers often close with the carpark. |
| `parking_fee_note` | A cheap kWh price behind a $15 carpark is not cheap. |
| `amenities` | Toilets, food, shelter. Tags, not free text. |
| `access_type` | Public, customers only, or staff/residents only. |

**connectors**: one row per *kind* of plug at a station, with a `quantity`,
rather than one row per physical plug. "4 × CCS2 at 150 kW" is what users can
actually see and report. Fields: `connector_type` (Type 2, CCS2, CHAdeMO,
Type 1, NACS), `current_type` (AC/DC), `power_kw`, `quantity`, `tethered`.

## Prices

Charger pricing is not one number, so a **price report** is one tariff as seen
on the screen or app at a moment in time:

| Field | Example |
| --- | --- |
| `per_kwh` | $0.60 |
| `per_minute` | $0.25 (some networks bill by time) |
| `session_fee` | $1.00 flat fee per session |
| `idle_fee_per_minute`, `idle_fee_grace_minutes` | $1.00/min after 10 min of being full |
| `tier` | `casual`, `member`, or `subscription`, with `plan_name` ("Tesla Supercharging membership") |
| `time_window_start`, `time_window_end`, `days_of_week` | Off-peak 10pm to 6am |
| `connector_type` | Null means the price applies to every plug at the station |
| `observed_at` | When the user saw the price, which can be earlier than when they submitted it |
| `photo_path` | Optional photo of the price screen, stored in Supabase Storage |

All money is AUD in `numeric(8,4)` dollars, so 59.5c/kWh is stored exactly. At
least one of `per_kwh`, `per_minute` or `session_fee` must be set, and a report
can also say the charger is free (`is_free`).

The "current price" for a station is the newest visible report for each
combination of tier, plan, time window and connector type. That is the
`current_prices` view.

**price_confirmations**: a one-tap "this is still correct". It refreshes how
old a price looks without making someone retype it, and gives a cheap trust
signal. One per user per report.

## Charger status

**status_reports**: "working", "faulty", or "blocked" (ICE'd or occupied), at
station or connector level. Kept separate from prices because they change on a
different timescale and people report them at different moments.

## Corrections

**station_edits**: user-suggested changes to station or connector details
(wrong operator, extra plugs, new payment method). Stored as a JSON diff with
`pending` / `applied` / `rejected` status, so there's a record of who changed
what. Whether edits apply instantly or wait for review is a product decision
for step 3; the table supports both.

## Users, trust and moderation

**profiles**: one per Supabase Auth user, holding `display_name`, `role`
(`user`, `moderator`, `admin`) and `reputation`.

**Shadowbans**: `profiles.shadowbanned_at` is set by a moderator. Row Level
Security means a shadowbanned user's reports, confirmations and edits are
visible to *that user* and to moderators, and to nobody else. From the banned
user's side nothing looks different. Public users cannot see who is banned, and
users cannot set their own `role`, `reputation` or ban fields.

**flags**: any signed-in user can flag a price report, status report or
station as wrong, spam or offensive. Moderators resolve flags, and a resolved
flag can hide the target (`hidden_at` on the target row).

Every user-authored row stores the author's id, so "who updated what" is always
answerable.

## Not in the first version

- Historical price charts. The data supports them (reports are never
  overwritten), but there's no view for it yet.
- Live availability from operator APIs.
- Per-plug (EVSE-level) tracking.
