# YouTube Watch History Life Journal

A polished personal archive app that turns YouTube watch-history JSON into a searchable, calendar-first life journal with timeline exploration, analytics, and in-app replay.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite for local persistence
- FullCalendar for day/week/month/year journal views
- Recharts for analytics
- Zustand + TanStack Query for UI state and data fetching
- Zod for ingestion validation

## Implemented core features (Phase 0 + Phase 1)

- Import YouTube watch-history JSON (`Preview` and `Import`)
- Validation and normalization with malformed entry handling
- Deduplication via deterministic `sourceEventHash`
- Incremental upsert into SQLite models (videos, channels, watch events, imports)
- FTS5-backed search index for watch events
- Day-default calendar journal with Day/Week/Month/Year/Timeline modes
- Video cards with thumbnail/title/channel/watched timestamp
- Detailed view with embedded YouTube player
- Global search + channel filter
- Analytics summary and charts (trend + top channels)

## Data model highlights

Prisma schema includes:

- `Video`
- `WatchEvent`
- `Channel`
- `ImportBatch`
- `Tag`, `EventTag`
- `Note`
- `Favorite`
- `SavedFilter`

Plus SQLite virtual FTS table: `watch_event_fts`.

## Run locally

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000 and import your YouTube watch-history JSON file.

## API routes

- `POST /api/import/preview`
- `POST /api/import/commit`
- `GET /api/events`
- `GET /api/search`
- `GET /api/analytics`

## Notes

- Local DB path: `file:./prisma/dev.db` (`.env`, ignored by git)
- Migrations are tracked under `prisma/migrations`
