# Operator to-do (your checklist)

**Purpose:** Things **you** (or your team) must do outside the codebase—accounts, secrets, SQL in the dashboard, production checks. The app and migrations live in git; this list is the living “what’s left for humans.”

**For AI assistants:** When you add a feature that requires operator action (new env var, new third-party setup, manual SQL, legal review, etc.), **update this file** in the same change: add a dated entry under *Changelog* and adjust the relevant section. Remove or check off items when they’re done.

---

## One-time: local development

- [ ] Copy [`.env.example`](../.env.example) → `.env.local` and fill values (see below).
- [ ] Create a **Supabase** project at [supabase.com](https://supabase.com).
- [ ] In Supabase **SQL Editor**, run **all** migration files in [supabase/migrations/](../supabase/migrations/) in timestamp order (including `20260404120000_seo_town_architecture.sql`, `20260407120000_topic_mining_privacy.sql`, `20260408120000_phase3_collections_claims_cache.sql` for Phase 3 collections/claims, `20260409000000_add_expanded_coastal_towns.sql` for expanded coastal coverage, `20260410130000_business_hero_image_storage.sql` for Storage bucket `business-images` + `hero_image_url`, `20260410140000_business_places_refresh_request.sql` for admin refresh queue, **`20260411120000_geoapify_directory_sources.sql`**, **`20260411210000_neutral_directory_column_names.sql`** — renames listing columns and `categories.taxonomy_type_hints`, and **`20260414120000_events_table.sql`** for time-limited events), **`20260415130000_events_weekly_recurrence.sql`** (weekly recurring events + `upcoming_events` refresh), **`20260414190000_area_type_transit_access.sql`** (adds `areas.area_type` value `point_of_interest`), **`20260414210000_area_transit_access_to_point_of_interest.sql`** (migrates legacy `transit_access` rows/constraints if present), **`20260420110000_cms_foundation.sql`** (site settings + content entries + field groups + media assets + `cms-media` bucket), **`20260423150000_visibility_defaults.sql`** (sets `is_hidden_from_search` default to NULL so Directus items are visible), then [supabase/seed.sql](../supabase/seed.sql). Details: [supabase/README.md](../supabase/README.md).
- [ ] Apply **`20260422110000_town_image_fields.sql`** to add `towns.hero_image_thumb_url` and `towns.hero_image_wide_url` (used by `/admin/towns/[id]` upload fields and town/home rendering).
- [ ] Apply **`20260422120000_featured_content.sql`** to create `public.featured_content` (required for `/admin/featured`, homepage featured blocks, and saving a business with **Feature on homepage**). If this migration is missing, PostgREST returns `public.featured_content not found in the schema cache`.
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
| `NEXT_PUBLIC_IMAGE_STORAGE_BUCKET` | Optional; default **`whereto30a-media`** | When `main_image` / `hero_image` store a **storage key** (not a full URL), the app builds `…/storage/v1/object/public/{bucket}/{key}`. Use `bucket/…` as the key prefix to pick another public bucket, or set this env to override the default. |
| `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT` | *(legacy / unused)* | No longer read by the app: browse and content slugs are **not** filtered by `status` in code. You can remove this from env if set. |
| `NEXT_PUBLIC_DIRECTUS_URL` | (Optional) Directus origin if you use it for editing only | **Not used for public image URLs** at runtime. |
| `ENABLE_SUPABASE_DIAG_UI` | Set to `1` on a **hosted** preview if you need `/dev/supabase-check` there. | **Off in production by default.** In `NODE_ENV=development` the page is available without this. |
| `ADMIN_USER_IDS` | Comma-separated Supabase Auth user UUIDs | Who can open `/admin` in the Next app (optional in-app shell). |
| `ADMIN_EMAILS` | Comma-separated emails | Alternative to `ADMIN_USER_IDS` for `/admin` access. |
| `FEATURE_FLAGS_JSON` | JSON object, e.g. `{"search":true,"auth":false,"saved":false}` | Server-side feature flags (replaces legacy `feature_flags` table). Keys include **`auth`** (sign in, profile, `/auth/callback`, claims API) and **`saved`** (Saved nav, `/saved`, saves/collections APIs). Legacy **`user_features`: `false`** disables both. Optional `ff_overrides` cookie merges the same shape (dev). |
| `HOME_HERO_TITLE`, `HOME_HERO_SUBTITLE`, `HOME_HERO_IMAGE_URL`, `HOME_SEARCH_PLACEHOLDER` | Local / Vercel env | Override homepage hero when not using legacy `site_settings`. |

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
- [ ] **CMS image uploads:** use `/admin/media` for upload-time processing (orientation normalization, responsive sizes, WebP outputs, metadata). Use returned URL in `/admin/site-settings` (hero) or content entries.

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
| 2026-04-24 | **Default Storage bucket:** Public image URLs default to **`whereto30a-media`** (not `whereto-media`). Apply **`20260425120000_whereto30a_media_bucket.sql`** so `resolve_directus_file_url` and `*_view` image URLs use the correct bucket; app rewrites legacy `/object/public/supabase/` and `/object/public/whereto-media/` paths when present. |
| 2026-04-24 | **Supabase diagnostics UI:** `/dev/supabase-check` (dev only) shows the same step-by-step checks as `pnpm run diagnose:supabase`. Optional **`ENABLE_SUPABASE_DIAG_UI=1`** enables that page on non-dev deploys (e.g. staging). |
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
| 2026-04-14 | **Area types:** Apply `20260414190000_area_type_transit_access.sql` (adds `point_of_interest`) and, if your DB ever had `transit_access`, **`20260414210000_area_transit_access_to_point_of_interest.sql`**. `point_of_interest` = parks, preserves, landmarks, trailheads, transit lots, scenic markers (browse: **Landmarks & parks**). Re-run `npm run content:compile` for `content/areas/*.md`, or `UPDATE public.areas SET area_type = 'point_of_interest' WHERE slug = 'grayton-central';` as needed. |
| 2026-04-15 | **Area browse visibility:** Apply **`20260415120000_areas_include_in_site_browse.sql`**. Adds `areas.include_in_site_browse` (default `true`); `grayton-central` is set `false` so it stays on the Grayton town hub only, not `/search?type=areas` or `type=access`. Re-run `npm run content:compile` after editing area frontmatter. |
| 2026-04-15 | **Weekly recurring events:** Apply **`20260415130000_events_weekly_recurrence.sql`**. Adds `events.recurrence_frequency` (`weekly`) and `events.recurrence_weekday` (0=Sun … 6=Sat); replaces **`upcoming_events`** so listings sort by the next occurrence. In event markdown, set `recurrence_frequency: weekly` and `recurrence_weekday` together with season `event_date` / `end_date` (if `end_date` is omitted for a weekly row, listings use a two-year horizon from `event_date`). Re-run `npm run content:compile` for `content/events/*.md`. |
| 2026-04-20 | **CMS foundation + ACF-style flexibility:** Apply **`20260420110000_cms_foundation.sql`**. Adds `site_settings`, `field_groups`, `field_definitions`, `content_entries`, `content_revisions`, `media_assets`, and public bucket `cms-media`. New admin routes: `/admin/site-settings`, `/admin/content`, `/admin/media`. For DB-first cutover, run `npm run content:migrate:db` to seed `content_entries` from existing `pages` rows. |
| 2026-04-22 | **Town image fields + Towns admin:** Apply **`20260422110000_town_image_fields.sql`**. Adds `towns.hero_image_thumb_url` + `towns.hero_image_wide_url`; `/admin/towns/[id]` now supports upload+process for both, and town/home UIs read these fields (thumb prioritized for cards, wide for town hero). |
| 2026-04-22 | **Featured content table:** Apply **`20260422120000_featured_content.sql`**. Creates `public.featured_content` with indexes and `updated_at` trigger. Without this table, business save (when syncing homepage featured) and `/admin/featured` fail with PostgREST “not found in the schema cache”. |
| 2026-04-23 | **Directus + new public schema:** Editorial and listings are edited in **Directus**; the app reads **Supabase** only. Set `NEXT_PUBLIC_DIRECTUS_URL` for asset URLs and the in-app admin link. `/admin` access uses `ADMIN_USER_IDS` / `ADMIN_EMAILS` (not `public.profiles`). Feature flags use `FEATURE_FLAGS_JSON` if needed. Regenerate types with `npm run supabase:types` / `supabase:types:remote` after schema changes. |
| 2026-04-23 | **Regions + `query_cache` + crons:** Apply **`20260423130000_regions_and_query_cache.sql`** (`regions`, `towns.region_id` FK, `query_cache` for TTL rows). [vercel.json](../vercel.json) schedules only **`/api/cron/cache-prune`**. Other `/api/cron/*` routes return a JSON *disabled* body (ingestion/AI/SEO pipelines off in favor of Directus + DB). Promote users via `ADMIN_USER_IDS` / `ADMIN_EMAILS` if you still use any env-gated tool routes—Next **in-app** `/admin` UI was removed. |
| 2026-04-24 | **Public images:** The storefront does **not** call Directus for assets. `getPublicImageUrl` builds Supabase **Storage** public URLs from `NEXT_PUBLIC_SUPABASE_URL` (and optional `NEXT_PUBLIC_IMAGE_STORAGE_BUCKET` / `bucket/…` keys). Default public bucket: **`whereto30a-media`**. Store full `https://…` URLs in the row if you prefer. |
| 2026-04-25 | **Why rows don’t show in browse/ home (historical, superseded):** the app no longer filters listing queries by `status`. Use **`archived_at` null** and **`is_hidden_from_search` not `true`** (`BROWSE_VISIBLE_NOT_HIDDEN`) for visibility. **Search › Areas** no longer filters out rows whose `area_type` isn’t only shopping/district/neighborhood. In Directus, clear archive and uncheck hide-from-search as needed. |
| 2026-04-27 | **Visibility filter bug (fixed in code):** `NOT (is_hidden_from_search = true)` in SQL excludes rows where the column is **`NULL`**, and null usually means “visible.” Lists use an explicit `is null OR = false` filter (`BROWSE_VISIBLE_NOT_HIDDEN`). |
| 2026-04-28 | **No `status` filtering in app code:** list/detail/search/scoring/refresh/claims (business lookup) and `content_entries` list + slug load do not filter by `status`. Claim **requests** still use `business_claim_requests.status` (`pending` dedupe). Discovery jobs still select `search_jobs` with `status = pending`. `archived_at` + `BROWSE_VISIBLE_NOT_HIDDEN` may still apply on browse routes. |
| 2026-04-29 | Removed dead `storefrontListingStatuses` helper from `lib/shop/public-listing-filters.ts` (file now exports only `BROWSE_VISIBLE_NOT_HIDDEN`). |
| 2026-04-29 | **`auth` / `saved` feature flags:** `FEATURE_FLAGS_JSON` keys `auth` and `saved` (default true). `user_features: false` turns both off. Middleware hides auth routes and `/saved`; APIs return 404 when disabled. |
| 2026-04-26 | **Areas vs POI:** **`areas`** and **`points_of_interest`** are separate tables. The town hub's **Areas & districts** block lists **all** listable `areas` for that town; it does not pull from `points_of_interest` (that is **/search?type=access** only, for now). The global nav "Landmarks & parks" item still appears when any listable `points_of_interest` row exists. |
| 2026-04-23 | **Directus visibility defaults:** Apply **`20260423150000_visibility_defaults.sql`** to set `is_hidden_from_search` default to `NULL` (visible). Fixes issue where new items created in Directus weren't appearing in search. Also updates existing hidden items that have `archived_at = NULL` to be visible. |

---

## Related docs

- [supabase/README.md](../supabase/README.md) — applying migration + seed
- [PRIVACY.md](./PRIVACY.md) — feedback data (internal-only)
- [whereto30a-full-task-list.md](./whereto30a-full-task-list.md) — full engineering checklist (human + code)
- [PRD.md](./PRD.md) — product source of truth
