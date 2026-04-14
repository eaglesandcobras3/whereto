# Operator to-do (your checklist)

**Purpose:** Things **you** (or your team) must do outside the codebase—accounts, secrets, SQL in the dashboard, production checks. The app and migrations live in git; this list is the living “what’s left for humans.”

**For AI assistants:** When you add a feature that requires operator action (new env var, new third-party setup, manual SQL, legal review, etc.), **update this file** in the same change: add a dated entry under *Changelog* and adjust the relevant section. Remove or check off items when they’re done.

---

## One-time: local development

- [ ] Copy [`.env.example`](../.env.example) → `.env.local` and fill values (see below).
- [ ] Create a **Supabase** project at [supabase.com](https://supabase.com).
- [ ] In Supabase **SQL Editor**, run **all** migration files in [supabase/migrations/](../supabase/migrations/) in timestamp order (including `20260404120000_seo_town_architecture.sql`, `20260407120000_topic_mining_privacy.sql`, `20260408120000_phase3_collections_claims_cache.sql` for Phase 3 collections/claims, `20260409000000_add_expanded_coastal_towns.sql` for expanded coastal coverage, `20260410130000_business_hero_image_storage.sql` for Storage bucket `business-images` + `hero_image_url`, `20260410140000_business_places_refresh_request.sql` for admin refresh queue, **`20260411120000_geoapify_directory_sources.sql`**, **`20260411210000_neutral_directory_column_names.sql`** — renames listing columns and `categories.taxonomy_type_hints`, and **`20260414120000_events_table.sql`** for time-limited events), then [supabase/seed.sql](../supabase/seed.sql). Details: [supabase/README.md](../supabase/README.md).
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
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → **Publishable** key (`sb_publishable_…`) | Public (RLS applies); replaces legacy anon JWT |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → API → **Secret** key (`sb_secret_…`) | **Server only** — never expose to browser; replaces legacy `service_role` JWT |
| *(legacy)* `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, legacy section | Still accepted if publishable is unset |
| *(legacy)* `SUPABASE_SERVICE_ROLE_KEY` | Same page, legacy section | Still accepted if secret is unset |
| `OPENAI_API_KEY` | OpenAI | Optional for local; without it, search uses keyword + template fallbacks |
| `GEOAPIFY_API_KEY` | [Geoapify MyProjects](https://myprojects.geoapify.com/) | Optional; without it, discovery and directory refresh crons skip external calls (discovery leaves jobs pending). Places + Place Details use OSM-derived data under Geoapify’s and ODbL terms — keep attribution (see `business_sources`). |
| `CRON_SECRET` | Generate a long random string | Required in **production** for `/api/cron/*`; omitted in `NODE_ENV=development` the app allows cron without secret |
| `NEXT_PUBLIC_SITE_URL` | Your canonical origin (e.g. `https://yoursite.com`) | Optional; improves sitemap, robots, and Open Graph URLs. Vercel sets `VERCEL_URL` as a server fallback if unset |

---

## One-time: production (e.g. Vercel)

- [ ] Create **Vercel** project, connect repo, set the same env vars as above (use Vercel **Environment Variables** for Production/Preview).
- [ ] In **Geoapify**, create a project and API key; restrict by IP if you call crons from fixed hosts (e.g. Vercel).
- [ ] Confirm [vercel.json](../vercel.json) **Cron** jobs are enabled on your Vercel plan (Crons require a compatible plan).
- [ ] Set `CRON_SECRET` in Vercel; Vercel Cron will send `Authorization: Bearer <CRON_SECRET>` to your routes.
- [ ] In Supabase, set **Auth** → **URL configuration** (site URL, redirect URLs) to your production domain so magic links work (include `/auth/callback` path if required by your setup).

---

## Runbook (operations)

- [ ] **Rotate keys** if leaked: Supabase secret key, OpenAI, Geoapify, `CRON_SECRET`. Update Vercel + local `.env.local`; revoke old keys in each provider.
- [ ] **Re-run failed discovery jobs:** in Supabase Table Editor, set `search_jobs.status` to `pending`, clear `error_message`, set `next_run_after` to `now()` for rows to retry; wait for cron or call `GET /api/cron/discovery` with `Authorization: Bearer $CRON_SECRET` (or local dev without secret).
- [ ] **Clear bad cache:** delete affected rows from `query_cache` or run cache-prune cron; optional full truncate during incidents.
- [ ] **Duplicate hygiene:** review **`/admin/duplicates`** periodically; merge pairs so one listing stays `active` and the duplicate is `hidden` + suppressed.
- [ ] **Cost sanity:** watch OpenAI and Geoapify credit usage; lower cron budgets in code if needed.
- [ ] **Listing hero images:** No third-party map photo sync. Set `hero_image_url` (and future `business_images` rows) from **owner uploads** or other licensed assets in Storage. The **`/api/cron/business-images`** route remains as a no-op placeholder. After bulk image changes, run **`/api/cron/recommendation-precompute`** so `query_cache` stays fresh.
- [ ] **Run tests locally:** `npm test` (Vitest); optional `npm run test:e2e` (Playwright; mocks APIs, starts dev server).

---

## Premium Redesign: Post-deployment tasks

After deploying the premium redesign code, complete these steps to enable new towns and content:

- [ ] **Apply expanded towns migration:** Run `20260409000000_add_expanded_coastal_towns.sql` in Supabase SQL Editor. This adds Destin, Miramar Beach, Sandestin, Dune Allen Beach, Gulf Place, Seagrove Beach, Prominence, and Panama City Beach.
- [ ] **Run discovery cron for new towns:** Trigger `/api/cron/discovery` to populate businesses for the new towns (Destin, Miramar Beach, Sandestin, etc.). The migration creates pending jobs automatically.
- [ ] **Run precompute cron:** Trigger `/api/cron/recommendation-precompute` to populate `query_cache` with recommendations for all towns (including new ones) and the 11 new intent types (brunch, breakfast, dinner, bars, live-music, shopping, outdoor-activities, wellness, water-sports, pet-friendly, romantic).
- [ ] **Run SEO publish cron:** Trigger `/api/cron/seo-publish` to create `seo_pages` entries from the precomputed cache rows.
- [ ] **Verify dark mode:** Test the site in both light and dark modes. The theme toggle is in the navbar.
- [ ] **Verify new towns:** Confirm `/destin`, `/miramar-beach`, `/sandestin`, `/panama-city-beach` and other new town pages render correctly.

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
| 2026-04-04 | Phase 2 SEO/towns: apply `20260404120000_seo_town_architecture.sql`; new crons `recommendation-precompute` + `seo-publish` in [vercel.json](../vercel.json). |
| 2026-04-06 | Phase 2 completion: optional `NEXT_PUBLIC_SITE_URL`; `/sitemap.xml` + `/robots.txt`; expanded precompute (all region towns × category/intent rows), town hubs read cache first; `popular-cache` cron runs a precompute pass; `generateStaticParams` skips DB when env missing so CI/`next build` works without Supabase. |
| 2026-04-06 | Privacy-safe topic mining: apply `20260407120000_topic_mining_privacy.sql`; admin **`/admin/topic-mining`** (paste HTML → aggregates only; candidates → build queue). See [DESIGN-PRIVACY-SAFE-HTML-TOPIC-MINING.md](./DESIGN-PRIVACY-SAFE-HTML-TOPIC-MINING.md). |
| 2026-04-06 | Phase 3 (MVP slice): apply `20260408120000_phase3_collections_claims_cache.sql` — saved **collections**, **listing claims** (`/admin/claims`, business page form), **share** Open Graph + coarse referrer host, **cache admin**, **bulk tags**, optional **SCORING_WEIGHT_*** env tuning. |
| 2026-04-05 | **Premium Redesign:** apply `20260409000000_add_expanded_coastal_towns.sql` — adds Destin, Miramar Beach, Sandestin, Panama City Beach, and 4 additional 30A communities. New design system with dark mode, upgraded components (Navbar, SearchBar, BusinessCard, TownCard, etc.), 11 new intent templates. Run discovery + precompute + SEO crons for new content. |
| 2026-04-07 | **Supabase API keys:** Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` (`sb_publishable_…` / `sb_secret_…`). Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` still work until you remove them. Update Vercel and `.env.local`. |
| 2026-04-07 | **Listing images:** Apply `20260410130000_business_hero_image_storage.sql`. Historical note: older stacks synced map photos into Storage; current code uses first-party / licensed images only. `/api/place-photo` returns 410. |
| 2026-04-07 | **Directory API cron-only:** (historical) External directory calls run only from authorized cron routes. |
| 2026-04-11 | **Geoapify directory:** Apply `20260411120000_geoapify_directory_sources.sql`. Set **`GEOAPIFY_API_KEY`**. Discovery uses Geoapify Places + `categories.geoapify_categories`; new listings get `business_sources` (`source_name=geoapify`). Refresh cron uses Place Details for Geoapify-linked rows. **`/api/cron/business-images`** cron removed from Vercel (route is a no-op). |
| 2026-04-11 | **Neutral column names:** Apply **`20260411210000_neutral_directory_column_names.sql`** — `listing_external_key`, `listing_rating`, `listing_review_count`, `legacy_photo_refs`, `directory_refresh_requested_at`, `taxonomy_type_hints`; `business_sources.source_name` uses `legacy_import` instead of a vendor-specific legacy label. |
| 2026-04-07 | **Visual theme:** Product UI matches [design/homepage.html](../design/homepage.html) (Material 3 light palette in `app/globals.css`). `<html>` is always `light` (no dark theme in product chrome); the header **theme toggle was removed**. Users' stored `whereto30a-theme` value is ignored for document class until a dark design exists. |
| 2026-04-14 | **Events table:** Apply `20260414120000_events_table.sql`. Adds `events` table with `event_date` and `end_date` for time-limited content. Events past their end date automatically hide via `upcoming_events` view. Add event markdown to `content/events/` folder with `type: event` and `event_date: YYYY-MM-DD`. |

---

## Related docs

- [supabase/README.md](../supabase/README.md) — applying migration + seed
- [PRIVACY.md](./PRIVACY.md) — feedback data (internal-only)
- [whereto30a-full-task-list.md](./whereto30a-full-task-list.md) — full engineering checklist (human + code)
- [PRD.md](./PRD.md) — product source of truth
