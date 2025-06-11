# Group Scholar Opportunity Radar

Opportunity Radar is a lightweight intelligence dashboard for tracking scholarship opportunities, deadlines, and fit signals. It is designed for weekly pipeline reviews and rapid briefing preparation.

## Features
- Filter by type, stage, region, and deadline window
- Watchlist tracking with local persistence and live sync when available
- Add custom opportunities (stored locally or synced to Postgres)
- Export the current dataset as CSV
- Auto-generated briefing signals and pipeline health summary

## Live data sync
When deployed on Vercel, Opportunity Radar syncs custom opportunities and watchlists to the Group Scholar Postgres database.

### Environment variables (Vercel)
Set these with `vercel env add` (do not commit credentials):
- `PGHOST`
- `PGUSER`
- `PGPASSWORD`
- `PGPORT`
- `PGDATABASE`
- `PGSSLMODE` (set to `require` unless your provider says otherwise)

### Database setup
Schema and seed data live in `db/schema.sql` and `db/seed.sql`.

## Local usage
Open `index.html` in your browser. Data is stored in `localStorage` for custom entries and watchlist signals. Live sync is disabled when running from `file://`.
