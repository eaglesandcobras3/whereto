# WhereTo30A (`whereto30a`)

AI-assisted local discovery for Florida’s 30A corridor. See [docs/PRD.md](docs/PRD.md) and [docs/whereto30a-implementation-plan.md](docs/whereto30a-implementation-plan.md).

**Human setup checklist:** [docs/OPERATOR-TODO.md](docs/OPERATOR-TODO.md) (keep this updated when onboarding or changing infra).

## Setup

1. Follow [docs/OPERATOR-TODO.md](docs/OPERATOR-TODO.md) for env, Supabase, and admin steps.
2. Copy [`.env.example`](.env.example) to `.env.local` and fill in Supabase + keys.
3. Apply all files in [supabase/migrations/](supabase/migrations/) (timestamp order) and [supabase/seed.sql](supabase/seed.sql) (see [supabase/README.md](supabase/README.md)).
4. `npm install` then `npm run dev`.

## Scripts

- `npm run dev` — local dev
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Vitest (scoring, API route mocks, feedback, rate limit, etc.)
- `npm run test:e2e` — Playwright (mocks `/api/*`; starts dev server; set `CI=1` in CI)

Cron routes under `/api/cron/*` expect `Authorization: Bearer $CRON_SECRET` in production; in `NODE_ENV=development` the secret check is skipped for easier local runs.
