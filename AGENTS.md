<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Operator tasks doc

When a change creates **work for the human operator** (new env vars, Supabase steps, Vercel/cron setup, manual SQL, compliance, etc.), update [docs/OPERATOR-TODO.md](docs/OPERATOR-TODO.md) in the same PR/change: keep sections accurate, add a row to **Changelog**, and add/remove checkboxes as needed.
<!-- END:nextjs-agent-rules -->

## Copy Voice Rule (Travel & Lifestyle)

For travel guides, restaurant posts, neighborhood features, and lifestyle content updates, use the Travel & Lifestyle Writing Voice defined in `content/README.md` under "Travel & Lifestyle Writing Voice".

Apply it to new copy and rewrites for public-facing editorial content.

## Image Source Rule

For all content types, markdown must not specify images.

- Do not add or rely on `hero_image` in markdown frontmatter
- Treat admin uploads / database image fields as the only valid image source

## Cursor Cloud specific instructions

Next.js 16 app (`whereto30a`), npm (`package-lock.json`), Supabase-backed. Standard commands live in [README.md](README.md) / `package.json` scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm test` (Vitest), `npm run test:e2e` (Playwright). CI gate = lint + `npm test` + `npm run build` (see `.github/workflows/ci.yml`).

Non-obvious setup/run notes:

- **Supabase env is required to build/run.** `npm run build` and `npm run dev` throw `Invalid env` without `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. The update script writes a gitignored `.env.local` with the same non-real placeholder values CI uses, so the app boots. `npm run lint` and `npm test` do not need env.
- **No local database schema in the repo.** There is no base migration under `supabase/migrations/` (only `supabase/seed.sql`, `config.toml`, and incremental `scripts/migrations/*.sql`), so `supabase db reset` / a fully seeded local Supabase is not reproducible from the repo alone. With placeholder creds, DB-backed pages render their shells but show empty data (e.g. `/towns` → "No towns are available") — this is expected locally, not a bug.
- **`ask` and `search` feature flags are PostHog-only with no dev bypass.** Without a real `NEXT_PUBLIC_POSTHOG_KEY` + flags enabled, `/ask` and `/search` redirect to `/` (middleware), and the Playwright `ask` specs skip by design. Some flags DO have dev-only escape hatches (in `development`): `DISCOVER_ENABLED=1`, `SEO_IMPROVEMENTS_ENABLED=1`, `COMMUNITY_TIPS_ENABLED=1`, `TOWN_FACTS_ENABLED=1` (+ matching `NEXT_PUBLIC_*` vars for client UI). Live Ask/Search demos additionally need `OPENAI_API_KEY`.
- **e2e browser is not in the update script.** Run `npx playwright install chromium` once before `npm run test:e2e`. Playwright starts its own dev server, but reuses an already-running one on `127.0.0.1:3000` when `CI` is unset (`reuseExistingServer`), and mocks all `/api/*`.
- Cron routes under `/api/cron/*` skip the `CRON_SECRET` check in `NODE_ENV=development`.
