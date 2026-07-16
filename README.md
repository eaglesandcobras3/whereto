# WhereTo30A (`whereto30a`)

AI-assisted local discovery for Florida’s 30A corridor.

**Business Portal:** [docs/PRD-business-portal.md](docs/PRD-business-portal.md) · [docs/business-portal-implementation-plan.md](docs/business-portal-implementation-plan.md) · [docs/OPERATOR-TODO-business-portal.md](docs/OPERATOR-TODO-business-portal.md)

**Human setup checklist:** [docs/OPERATOR-TODO.md](docs/OPERATOR-TODO.md) (site-wide) and [docs/OPERATOR-TODO-business-portal.md](docs/OPERATOR-TODO-business-portal.md) (portal rollout).

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
- `npm run test:e2e` — Playwright public-surface suite (`e2e/`). Locally starts the Next server; against Vercel set `PLAYWRIGHT_BASE_URL` (no Supabase secret needed). Example: `PLAYWRIGHT_BASE_URL=https://whereto30a.com E2E_LIVE_DATA=1 npm run test:e2e`. Optional `VERCEL_AUTOMATION_BYPASS_SECRET` if Deployment Protection is on.

Cron-style routes under `/api/cron/*` expect `Authorization: Bearer $CRON_SECRET` in production; in `NODE_ENV=development` the secret check is skipped for easier local runs.

There are currently **no scheduled Vercel crons**. Remaining cron-style routes (for example `/api/cron/cache-prune`, `/api/cron/search-stats`, `/api/cron/indexnow`, `/api/cron/seo-audit`, and `/api/cron/rankscore-guides`) are manual/on-demand maintenance endpoints only.
