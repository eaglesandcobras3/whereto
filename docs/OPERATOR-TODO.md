# Operator to-do (your checklist)

**Purpose:** Things **you** (or your team) must do outside the codebase—accounts, secrets, SQL in the dashboard, production checks. The app and migrations live in git; this list is the living “what’s left for humans.”

**For AI assistants:** When you add a feature that requires operator action (new env var, new third-party setup, manual SQL, legal review, etc.), **update this file** in the same change: add a dated entry under *Changelog* and adjust the relevant section. Remove or check off items when they’re done.

---

## One-time: local development

- [ ] Copy [`.env.example`](../.env.example) → `.env.local` and fill values (see below).
- [ ] Create a **Supabase** project at [supabase.com](https://supabase.com).
- [ ] In Supabase **SQL Editor**, run **all** migration files in [supabase/migrations/](../supabase/migrations/) in timestamp order (initial schema plus `20260403140000_insert_discovery_business_with_tags.sql` for atomic discovery inserts), then [supabase/seed.sql](../supabase/seed.sql). Details: [supabase/README.md](../supabase/README.md).
- [ ] If the `on_auth_user_created` trigger on `auth.users` fails in SQL Editor, create it via Dashboard → **Authentication** / **Database** hooks per Supabase docs, or run the trigger block from the migration when you have sufficient privileges.
- [ ] From the repo: `npm install` and `npm run dev`.
- [ ] Sign up once via `/login` (magic link). In Supabase SQL Editor, promote yourself to admin:
  ```sql
  UPDATE public.profiles SET is_admin = TRUE WHERE id = '<your-auth-user-uuid>';
  ```
  (Find your UUID under Authentication → Users.)
- [ ] Open **`/admin`** (after `is_admin`) to manage businesses, jobs, ingestion, scores, and duplicates.

### Environment variables (reference)

| Variable | Where | Notes |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Public (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Server only** — never expose to browser |
| `OPENAI_API_KEY` | OpenAI | Optional for local; without it, search uses keyword + template fallbacks |
| `GOOGLE_PLACES_API_KEY` | Google Cloud → Places API (New) | Optional; without it, discovery cron skips jobs (leaves them pending) |
| `CRON_SECRET` | Generate a long random string | Required in **production** for `/api/cron/*`; omitted in `NODE_ENV=development` the app allows cron without secret |

---

## One-time: production (e.g. Vercel)

- [ ] Create **Vercel** project, connect repo, set the same env vars as above (use Vercel **Environment Variables** for Production/Preview).
- [ ] In **Google Cloud**, enable **Places API (New)**, create an API key, restrict by HTTP referrer / IP as appropriate.
- [ ] Confirm [vercel.json](../vercel.json) **Cron** jobs are enabled on your Vercel plan (Crons require a compatible plan).
- [ ] Set `CRON_SECRET` in Vercel; Vercel Cron will send `Authorization: Bearer <CRON_SECRET>` to your routes.
- [ ] In Supabase, set **Auth** → **URL configuration** (site URL, redirect URLs) to your production domain so magic links work (include `/auth/callback` path if required by your setup).

---

## Runbook (operations)

- [ ] **Rotate keys** if leaked: Supabase service role, OpenAI, Google Places, `CRON_SECRET`. Update Vercel + local `.env.local`; revoke old keys in each provider.
- [ ] **Re-run failed discovery jobs:** in Supabase Table Editor, set `search_jobs.status` to `pending`, clear `error_message`, set `next_run_after` to `now()` for rows to retry; wait for cron or call `GET /api/cron/discovery` with `Authorization: Bearer $CRON_SECRET` (or local dev without secret).
- [ ] **Clear bad cache:** delete affected rows from `query_cache` or run cache-prune cron; optional full truncate during incidents.
- [ ] **Duplicate hygiene:** review **`/admin/duplicates`** periodically; merge pairs so one listing stays `active` and the duplicate is `hidden` + suppressed.
- [ ] **Cost sanity:** watch OpenAI and Google Cloud billing dashboards; lower cron budgets in code if needed.
- [ ] **Run tests locally:** `npm test` (Vitest); optional `npm run test:e2e` (Playwright; mocks APIs, starts dev server).

---

## Not done in code yet (optional follow-ups)

- **Stricter rate limits:** move from in-memory per instance to Vercel KV / edge if you need global quotas.
- **Legal:** publish your own Terms of Service and Privacy Policy; see [PRIVACY.md](./PRIVACY.md) for feedback handling notes only.

---

## Changelog (operator-relevant)

| Date | What changed |
|------|----------------|
| 2026-04-03 | Initial checklist; then: `/admin` UI, expanded runbook, `npm test`, [PRIVACY.md](./PRIVACY.md). |
| 2026-04-03 | Phase 1 wrap: run **both** SQL migrations (adds `insert_discovery_business_with_tags`); CI runs lint, Vitest, build, Playwright; in-memory `/api/search` rate limit in code. |

---

## Related docs

- [supabase/README.md](../supabase/README.md) — applying migration + seed
- [PRIVACY.md](./PRIVACY.md) — feedback data (internal-only)
- [30A-FULL-TASK-LIST.md](./30A-FULL-TASK-LIST.md) — full engineering checklist (human + code)
- [PRD.md](./PRD.md) — product source of truth
