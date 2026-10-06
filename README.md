# ChargerPrices

Community-sourced EV charger prices for Australia. Drivers report what a
charger costs, and everyone sees the latest price and how fresh it is.

- Data model: [docs/data-model.md](docs/data-model.md)
- Database schema: [supabase/migrations](supabase/migrations)

Built with Next.js (TypeScript) and Supabase (Postgres + PostGIS, auth,
storage). The map uses Leaflet with OpenStreetMap tiles, so there is no map API
key to manage.

## Running locally

You need Node 20.9+ and Docker (for the local Supabase stack).

```sh
npm install
npx supabase start          # Postgres, auth and a test mail inbox, with sample data
cp .env.example .env.local  # then paste API_URL and PUBLISHABLE_KEY from `npx supabase status`
npm run dev
```

Open http://127.0.0.1:3000. Sign in with any email address; the sign-in link
lands in the local inbox at http://127.0.0.1:54324. The sample data includes a
user `demo@example.com` with a few reported prices around Sydney.

Useful commands:

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests |
| `npm run lint` / `npm run typecheck` | Lint and type-check |
| `npx supabase db reset` | Rebuild the local database from migrations and `supabase/seed.sql` |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` after a schema change |
| `npm run import:ocm` | Import stations from Open Charge Map (see below) |

## Importing stations from Open Charge Map

Get a free API key at https://openchargemap.org/site/profile/applications, put
it in `.env.local` as `OCM_API_KEY` along with `SUPABASE_SECRET_KEY`, then:

```sh
npm run import:ocm -- --dry-run      # preview what would be imported
npm run import:ocm -- --state NSW    # import one state
npm run import:ocm                   # import all of Australia
```

Re-running only adds new stations; stations already imported are left as they
are so user corrections aren't overwritten.

## Deploying

1. Create a project at https://supabase.com and link it: `npx supabase link`,
   then `npx supabase db push` to apply the migrations.
2. In Supabase, under Authentication → URL Configuration, set the Site URL to
   your production URL and add `https://<your-domain>/**` to the redirect URLs.
3. Import this repo at https://vercel.com/new and set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
   `NEXT_PUBLIC_SITE_URL`.
4. Run the Open Charge Map import against the production database.

Supabase's built-in email sender is rate-limited and meant for testing. Before
real users arrive, set up custom SMTP under Authentication → Emails.
