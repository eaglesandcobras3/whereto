# 30A Insider (Next.js)

AI-assisted local discovery for Florida’s 30A corridor. See [docs/PRD.md](docs/PRD.md) and [docs/30A-IMPLEMENTATION-PLAN.md](docs/30A-IMPLEMENTATION-PLAN.md).

## Setup

1. Copy [`.env.example`](.env.example) to `.env.local` and fill in Supabase + keys.
2. Apply [supabase/migrations/20260402120000_init.sql](supabase/migrations/20260402120000_init.sql) and [supabase/seed.sql](supabase/seed.sql) (see [supabase/README.md](supabase/README.md)).
3. `npm install` then `npm run dev`.

## Scripts

- `npm run dev` — local dev
- `npm run build` — production build
- `npm run lint` — ESLint

Cron routes under `/api/cron/*` expect `Authorization: Bearer $CRON_SECRET` in production; in `NODE_ENV=development` the secret check is skipped for easier local runs.
