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
| **`SEARCH_QUERY_EMBEDDINGS`** | `true` / `false` (default **`true`**) | When **`false`**, `/search` and **`/api/search`** skip OpenAI **`embeddings.create`** for the user query (no per-search embedding charge; hybrid RPC is skipped, ILIKE path only). In-memory cache still applies when enabled. |
| **`SEARCH_OPENAI_INTENT_PARSE`** | `true` / `false` (default **`true`**) | When **`false`**, user search never calls **`parseIntentWithOpenAI`** (no intent chat completion); keyword heuristics + retail repair only. Combine with **`SEARCH_QUERY_EMBEDDINGS=false`** for zero OpenAI on interactive search while keeping **`OPENAI_API_KEY`** for scripts or other features. |
| **`ASK_API_SECRET`** | Long random string | Optional. When set, non-browser clients must send `Authorization: Bearer <secret>` on `/api/ask/*`. |
| **`WORKFLOW_SECRET`** | Long random string | Required in production for `/api/workflows/*` trigger routes. |
| **`UPSTASH_REDIS_REST_URL`** | Upstash console | Optional. Global rate limits for ask/chat when set (with token below). |
| **`UPSTASH_REDIS_REST_TOKEN`** | Upstash console | Pair with URL for ask rate limiting. |
| **`ASK_RATE_LIMIT_CHAT_MAX`** | e.g. `10` | Chat requests per window (default **10**). |
| **`ASK_RATE_LIMIT_CHAT_WINDOW_SEC`** | e.g. `600` | Chat window seconds (default **600** = 10 min). |
| **`FEATURE_FLAGS_JSON`** | include **`"ask":true`** | Enables `/ask` and `/api/ask/*`. Default off in production; **`next dev`** turns **`ask` on** when the key is omitted (same as **`search`**). |
| **`SEARCH_LEARNING_ENABLED`** | `true` / `false` (default **`false`**) | Enables the self-learning search loop: impression logging (`search_impressions`), click tracking (`search_clicks`), and CTR-based ranking boost (`search_cluster_business_stats`). Requires migrations `20260528120000`, `20260529000000`, and `20260529000100` applied in Supabase. The learning boost only activates after ≥20 impressions + ≥2 clicks per cluster (sparse-data safe). Set **`true`** in both `.env.local` and Vercel after applying migrations. |
| `GEOAPIFY_API_KEY` | [Geoapify MyProjects](https://myprojects.geoapify.com/) | Optional; without it, discovery and directory refresh crons skip external calls (discovery leaves jobs pending). Places + Place Details use OSM-derived data under Geoapify’s and ODbL terms — keep attribution (see `business_sources`). |
| `CRON_SECRET` | Generate a long random string | Required in **production** for `/api/cron/*`; omitted in `NODE_ENV=development` the app allows cron without secret |
| **`INDEXNOW_KEY`** | Long random hex string (e.g. `openssl rand -hex 32`) | Optional. When set, serves verification at **`https://{site}/{INDEXNOW_KEY}.txt`** and enables **`GET /api/cron/indexnow`** (weekly, see [vercel.json](../vercel.json)) to ping Bing/Yandex via [IndexNow](https://www.indexnow.org/). Also submit key in Bing Webmaster Tools. |
| `NEXT_PUBLIC_SITE_URL` | Your canonical origin (e.g. `https://whereto30a.com`) | **Strongly recommended in production.** Sets `metadataBase`, canonical URLs, **`/sitemap.xml`** `<loc>` values, **`robots.txt`** `Sitemap:` line (`lib/site-url.ts`). Prefer your **apex** or **`www`**—not both—with Vercel redirecting alternate host. If omitted on Vercel **production**, the app falls back to **`VERCEL_PROJECT_PRODUCTION_URL`** (production hostname configured in Vercel); previews still prefer **`VERCEL_URL`**. |
| `NEXT_PUBLIC_IMAGE_STORAGE_BUCKET` | Optional; default **`whereto30a-media`** | When `main_image` / `hero_image` store a **storage key** (not a full URL), the app builds `…/storage/v1/object/public/{bucket}/{key}`. Use `bucket/…` as the key prefix to pick another public bucket, or set this env to override the default. |
| `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT` | *(legacy / unused)* | No longer read by the app: browse and content slugs are **not** filtered by `status` in code. You can remove this from env if set. |
| `NEXT_PUBLIC_DIRECTUS_URL` | (Optional) Directus origin if you use it for editing only | **Not used for public image URLs** at runtime. |
| `ENABLE_SUPABASE_DIAG_UI` | Set to `1` on a **hosted** preview if you need `/dev/supabase-check` there. | **Off in production by default.** In `NODE_ENV=development` the page is available without this. |
| **`FTS_SEARCH_ENABLED`** | Set to `true` (server-side only) | Switches search from ilike to Postgres full-text search (`search_vector`). Requires migration **`20260524120000_fts_businesses.sql`** to be applied first. |
| **`OPENAI_API_KEY`** | OpenAI | Already required for intent parsing. Also used by **`local/generate-embeddings.ts`** for `text-embedding-3-small` embeddings. |
| `ADMIN_USER_IDS` | Comma-separated Supabase Auth user UUIDs | Who can open `/admin` in the Next app (optional in-app shell). |
| `ADMIN_EMAILS` | Comma-separated emails | Alternative to `ADMIN_USER_IDS` for `/admin` access. |
| `FEATURE_FLAGS_JSON` | JSON object, e.g. `{"search":true,"auth":false,"saved":false}` | Server-side feature flags (replaces legacy `feature_flags` table). **`search`** gates the homepage hero search and related UI (defaults **off** in production unless you set **`"search":true`**). In **`NODE_ENV=development`** (`next dev`), **`search` defaults to on** whenever **`FEATURE_FLAGS_JSON` omits a `search` key; set **`"search":false`** in JSON to hide search locally. Other keys include **`auth`** (sign in, profile, `/auth/callback`, claims API) and **`saved`** (Saved nav, `/saved`, saves/collections APIs). Legacy **`user_features`: `false`** disables both. **`services_nav`**: set **`true`** to show the **Services** item in the header browse nav (default **off**). **`guide_hub_search_callout`**: set **`true`** to show the **“Ready to Explore?” / Start Searching** block at the bottom of **`/guide`** (default **off**). Optional `ff_overrides` cookie merges the same shape (dev). |
| `HOME_HERO_TITLE`, `HOME_HERO_SUBTITLE`, `HOME_HERO_IMAGE_URL`, `HOME_SEARCH_PLACEHOLDER` | Local / Vercel env | Override homepage hero when not using legacy `site_settings`. |
| `RESEND_API_KEY` | [Resend](https://resend.com/) → API keys | **Server only.** Required for **`POST /api/listing-requests`** and **`POST /api/business-claim-email`** (sidebar “Claim or update listing” on business pages). |
| `RESEND_FROM_EMAIL` | Resend-verified sender | Optional shorthand: used if **`LISTING_NOTIFICATION_FROM_EMAIL`** is unset (same verified domain rules). |
| `LISTING_NOTIFICATION_FROM_EMAIL` | Resend-verified sender | Optional override for **`From`**. Chain: **`LISTING_NOTIFICATION_FROM_EMAIL`** → **`RESEND_FROM_EMAIL`** → code default **`contact@whereto30a.com`** (apex domain must be verified for that mailbox in Resend). |
| `LISTING_NOTIFICATION_TO_EMAIL` | Your inbox | Optional; defaults **`add@whereto30a.com`**. Overrides listing-request recipient only. |
| `CLAIM_NOTIFICATION_FROM_EMAIL` | Resend-verified sender | Optional **`From`** for **`POST /api/business-claim-email`**. If unset: **`LISTING_NOTIFICATION_FROM_EMAIL`**, **`RESEND_FROM_EMAIL`**, then code default **`contact@whereto30a.com`**. |
| `CLAIM_NOTIFICATION_TO_EMAIL` | Your inbox | Optional; defaults **`claim@whereto30a.com`**. Recipient for claim / correction emails from listing pages. |
| **`FEEDBACK_NOTIFICATION_TO_EMAIL`** | Your inbox | Optional; defaults **`feedback@whereto30a.com`**. Recipient for **`POST /api/business-feedback`** (footer **Listing feedback** → **`/feedback`**). |
| **`FEEDBACK_NOTIFICATION_FROM_EMAIL`** | Resend-verified sender | Optional **`From`** for business feedback emails. If unset: **`LISTING_NOTIFICATION_FROM_EMAIL`** → **`RESEND_FROM_EMAIL`** → code default (**`contact@whereto30a.com`** chain). Shares **`RESEND_API_KEY`** with listing/claim flows. |
| **`NEXT_PUBLIC_INSTAGRAM_URL`** | Full profile URL | **Default:** `https://www.instagram.com/whereto30a/` (@whereto30a). Set to override staging; set to empty string **only** if you intentionally hide Instagram in the footer. |
| **`NEXT_PUBLIC_TIKTOK_URL`** | Full profile URL | **Default:** `https://www.tiktok.com/@whereto30a`. Same override / hide pattern as Instagram. |

---

## One-time: production (e.g. Vercel)

- [ ] Create **Vercel** project, connect repo, set the same env vars as above (use Vercel **Environment Variables** for Production/Preview).
- [ ] **Resend:** Verify your domain (`whereto30a.com`), create **`RESEND_API_KEY`**. **`From`** defaults to **`contact@whereto30a.com`** in code; override with **`LISTING_NOTIFICATION_FROM_EMAIL`** / **`RESEND_FROM_EMAIL`** / **`CLAIM_NOTIFICATION_FROM_EMAIL`** / **`FEEDBACK_NOTIFICATION_FROM_EMAIL`** if needed. Optional inboxes (**`LISTING_NOTIFICATION_TO_EMAIL`**, **`CLAIM_NOTIFICATION_TO_EMAIL`**, **`FEEDBACK_NOTIFICATION_TO_EMAIL`**) — defaults **`add@whereto30a.com`** / **`claim@whereto30a.com`** / **`feedback@whereto30a.com`** for the **`/feedback`** form.
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
- [ ] **`/list-your-business`:** Requires **`RESEND_API_KEY`**. Notifications go to **`LISTING_NOTIFICATION_TO_EMAIL`** if set, otherwise **`add@whereto30a.com`**. **`From`**: **`LISTING_NOTIFICATION_FROM_EMAIL`** → **`RESEND_FROM_EMAIL`** → **`contact@whereto30a.com`**. Tune **`LISTING_REQUEST_RATE_LIMIT_MAX`** (default 5 per IP per **`LISTING_REQUEST_RATE_LIMIT_WINDOW_SEC`**, default 3600) or set **`DISABLE_LISTING_REQUEST_RATE_LIMIT=1`** for local testing (shared counter shape with claims email). **Note:** Listing requests are **not** persisted to **`business_listing_requests`** by this endpoint anymore; inbound mail is your queue. Historical rows in that table remain valid if you used the older flow.
- [ ] **Business page “Claim or update listing”:** **`POST /api/business-claim-email`** emails **`CLAIM_NOTIFICATION_TO_EMAIL`** (default **`claim@whereto30a.com`**). **`From`** chain **`CLAIM_NOTIFICATION_FROM_EMAIL`** → listing / **`RESEND_FROM_EMAIL`** → **`contact@whereto30a.com`**. Validates the **`business_slug`** against **`businesses_view`** (same browse visibility as public pages).
- [ ] **Listing feedback (**`/feedback`**):** **`POST /api/business-feedback`** emails **`FEEDBACK_NOTIFICATION_TO_EMAIL`** (default **`feedback@whereto30a.com`**). Requires **`RESEND_API_KEY`**. **`From`**: **`FEEDBACK_NOTIFICATION_FROM_EMAIL`** → same chain as listings. Shares listing rate-limit buckets shape (**`biz-feedback:${IP}`**, same window env vars as **`/api/listing-requests`**). Footer link: **Listing feedback**.
- [ ] **Search indexing:** Set **`NEXT_PUBLIC_SITE_URL`** to the **same** HTTPS origin verified in Search Console (**apex vs `www`** — pick one canonical; add a Vercel redirect from the alternate). Submit **`/sitemap.xml`** under **Indexing → Sitemaps** (`https://whereto30a.com/sitemap.xml`). Add Google’s HTML tag in **`app/layout.tsx`** `metadata.verification.google` once GSC supplies it (`app/layout.tsx` has a commented placeholder today). Inspect key URLs (“URL Inspection”) after deployments. If **`/sitemap.xml` ever responds 5xx**, fix Supabase/`businesses_view` access first—crawlers will fall back slower and may stop trusting the endpoint.
- [ ] **IndexNow (optional):** Generate **`INDEXNOW_KEY`**, set in Vercel, confirm **`https://whereto30a.com/{INDEXNOW_KEY}.txt`** returns the key as plain text, register the key in [Bing Webmaster Tools](https://www.bing.com/webmasters/). Weekly cron **`/api/cron/indexnow`** pings hub URLs when **`CRON_SECRET`** is set.
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

## Search quality enrichment (run once, in order)

These one-time scripts populate fields that power NL search, FTS, and semantic similarity. Run them after Directus data is loaded.

### 1. Backfill `town_id` on businesses
```bash
npx tsx local/backfill-town-id.ts --dry-run   # preview
npx tsx local/backfill-town-id.ts             # write
```
Matches businesses to towns via address → slug → title. Unmatched businesses can be set manually in Directus.

### 2. Enrich categories, keywords, intent tags, and price level
```bash
npx tsx local/enrich-categories-and-keywords.ts --dry-run   # preview
npx tsx local/enrich-categories-and-keywords.ts             # write
```
Uses OpenAI `gpt-4o-mini` to assign `primary_category_id`, `search_keywords`, `intent_tags` (JSON array), and `price_level` (`1`–`4`). Requires `OPENAI_API_KEY`. Creates the 6 standard categories in DB if missing.

### 3. Apply Postgres FTS migration
In Supabase SQL Editor, run **`supabase/migrations/20260524120000_fts_businesses.sql`**. This adds `search_vector tsvector` to `businesses` with a weighted trigger (title=A, keywords=B, excerpt=C, content=D), a GIN index, and a backfill of existing rows. The `businesses_view` picks it up automatically (uses `SELECT b.*`).

Then set **`FTS_SEARCH_ENABLED=true`** in your environment (Vercel + `.env.local`) to switch search from ilike to FTS.

### 4. Enable pgvector and apply embeddings migration
- In Supabase **Dashboard → Database → Extensions**, search "vector" and enable **pgvector**.
- In SQL Editor, run **`supabase/migrations/20260524130000_pgvector_embeddings.sql`**. This adds `embedding vector(1536)`, an HNSW index, and the `hybrid_search_businesses()` RPC function.

### 5. Apply business intelligence migration
In Supabase SQL Editor, run **`supabase/migrations/20260526120000_business_intelligence.sql`**. This adds structured facet columns (`business_type`, `item_tags`, `dietary_tags`, `meal_period_tags`, `atmosphere_tags`, `occasion_tags`, `qa_document`, `qa_document_updated_at`) and replaces `hybrid_search_businesses` with a version that supports multi-town filtering and returns new columns for composite scoring.

### 6. Search enrichment pipeline (recommended: BI + embeddings, minimal GPT calls)

```bash
npx tsx local/enrich-search-pipeline.ts --dry-run   # preview
npx tsx local/enrich-search-pipeline.ts             # gap-only: rows missing qa AND/OR embedding timestamps
npx tsx local/enrich-search-pipeline.ts --force     # regenerate BI + embeddings for every row in scope
npx tsx local/enrich-search-pipeline.ts --id <id>   # single business
npx tsx local/enrich-search-pipeline.ts --published-only   # limit to published (default is published + draft)
```

**Why use this:** One command walks each listing in order. It calls **GPT-4o-mini only when `qa_document_updated_at` is null** (or with `--force`). It **does not** call chat completion for rows that already have a Q&A doc but still need a vector. Embeddings use the same **batched** `text-embedding-3-small` requests as `local/generate-embeddings.ts` (up to 100 texts per call). Shared logic lives under `local/lib/search-enrichment/`.

**Scope:** Default **`status IN ('published','draft')`**, not archived. **`--published-only`** matches the old “published-only” behavior.

**Gap-only (no `--force`):** Selects rows where **`qa_document_updated_at` OR `embedding_updated_at`** is NULL (PostgREST `or` filter).

### 7. Generate business intelligence only (standalone)

```bash
npx tsx local/generate-business-intelligence.ts --dry-run   # preview
npx tsx local/generate-business-intelligence.ts             # write
npx tsx local/generate-business-intelligence.ts --force     # regenerate all
npx tsx local/generate-business-intelligence.ts --id <id>   # single business
npx tsx local/generate-business-intelligence.ts --published-only   # published only (default includes drafts)
```
Uses `gpt-4o-mini`. One call per business. Writes `business_type`, all tag arrays, and a `qa_document` — the Q&A-format text used as the embedding source. Run `DEBUG_INTEL=1 npx tsx local/generate-business-intelligence.ts --id <id>` to inspect output for a single listing.

### 8. Generate embeddings only (standalone)

```bash
npx tsx local/generate-embeddings.ts --dry-run   # preview (no API calls)
npx tsx local/generate-embeddings.ts             # write
npx tsx local/generate-embeddings.ts --force     # regenerate all
npx tsx local/generate-embeddings.ts --published-only   # published only (default includes drafts)
```
Uses `text-embedding-3-small` (1536 dims). Prefers the `qa_document` over `search_profile` as the embedding source. After standalone step 7, run this for any rows still missing **`embedding_updated_at`**, or use **step 6** instead for a single pass.

**Gap-only runs (no `--force`) on standalone scripts:** Each loads rows where the matching `*_updated_at` is NULL (`qa_document_updated_at` in step 7, `search_profile_updated_at` in `local/generate-search-profiles.ts`, `embedding_updated_at` in step 8). Default status is **`published` + `draft`**; **`--published-only`** restricts to published.

### 9. Regenerate business listing copy (Maps scrape + GPT-4o)

Shared prompt: `local/lib/business-content/` (used by **`local/add-businesses.ts`** for new listings too).

```bash
npx tsx local/regenerate-business-content.ts --dry-run              # previews → local/previews/regenerated/
npx tsx local/regenerate-business-content.ts --limit 5              # small live batch
npx tsx local/regenerate-business-content.ts --id <uuid>            # one listing
npx tsx local/regenerate-business-content.ts --all-outside-core     # every non–core-town row (incl. with images)
npx tsx local/regenerate-business-content.ts --include-with-images  # drop “no image” filter
npx tsx local/regenerate-business-content.ts --include-core-towns    # include seaside / rosemary / grayton / carillon
npx tsx local/regenerate-business-content.ts --skip-search-pipeline # content/SEO only (no BI + embedding)
```

**Default scope:** `published` + `draft`, not archived, **no hero/main image**, town **not** in `seaside`, `rosemary-beach`, `grayton-beach`, `carillon-beach`. Requires **`OPENAI_API_KEY`**, Supabase service role, and Playwright (headed browser session under `local/.browser-session`). Each row: Google Maps reviews → **gpt-4o** markdown + SEO → optional **gpt-4o-mini** BI + embedding (unless `--skip-search-pipeline`). Review previews before large live runs.

**Resume:** Live runs skip rows in **`local/.regenerate-business-content-progress.json`** or already finished in the DB. After a partial batch without a progress file: `npx tsx local/regenerate-business-content.ts --seed-done` (same scope flags as your run). `--status` | `--force` | `--clear-progress`.

---

## Search quality evals + self-learning loop

The full feedback loop is built. Follow these steps to activate it.

### Step 1: Apply migrations (Supabase SQL Editor, in order)

1. **`supabase/migrations/20260528120000_search_learning_signals.sql`** — creates `search_impressions`, `search_clicks`, `search_cluster_business_stats`, and the `refresh_search_cluster_business_stats()` RPC.
2. **`supabase/migrations/20260529000000_search_eval_runs.sql`** — creates `search_eval_runs` for LLM-as-judge scores and golden-set CI results.
3. **`supabase/migrations/20260529000100_search_monitoring_views.sql`** — creates three read-only monitoring views (see below).

### Step 2: Set env var

- [ ] Set **`SEARCH_LEARNING_ENABLED=true`** in `.env.local` **and** Vercel → Environment Variables (Production + Preview).

### Step 3: Verify the daily stats cron

- [ ] Confirm `/api/cron/search-stats` is listed in `vercel.json` crons (runs once daily at **11:00 UTC**, `0 11 * * *`; Hobby plan cannot use hourly schedules).
- [ ] Confirm **`CRON_SECRET`** is set in Vercel (shared with all cron routes).
- [ ] After the first scheduled run (or a manual `GET` with the cron secret), check `search_cluster_business_stats` is being populated.

### Step 4: Backfill business intelligence (if not already done)

The learning boost only helps if base results are correct. The eval CI will expose gaps in `item_tags`, `business_type`, and `qa_document`. If many businesses are missing these fields:

```bash
# Step A — generate Q&A documents + structured tags (GPT-4o-mini, one call/business)
npx tsx local/generate-business-intelligence.ts

# Step B — re-embed from qa_document (text-embedding-3-small)
npx tsx local/generate-embeddings.ts --force
```

Or use the combined pipeline (recommended — skips BI calls for rows that already have a Q&A doc):
```bash
npx tsx local/enrich-search-pipeline.ts
```

### Step 5: Wire GitLab CI eval gate

- [ ] In GitLab → Settings → CI/CD → Variables, add:
  - `STAGING_SUPABASE_URL` — staging Supabase project URL
  - `STAGING_SUPABASE_KEY` — staging Supabase **secret** key
  - `OPENAI_API_KEY` — already set if using OpenAI elsewhere
- [ ] `.gitlab-ci.yml` is already committed. MRs touching `lib/search/**` will automatically run `npx tsx local/eval-search.ts --ci` against staging.

### Monitoring views (query in Supabase dashboard)

After migration `20260529000100` is applied, three views are available:

| View | What it shows |
|------|---------------|
| `v_search_zero_result_rate` | Daily zero-result % by category (30-day window) |
| `v_search_path_mix` | Daily retrieval path breakdown (hybrid/ilike) with avg result counts |
| `v_search_top_failing_queries` | Top 100 zero-result queries in last 30 days |

### LLM-as-judge eval (run manually for trend data)

```bash
npx tsx local/eval-search-llm.ts                    # last 7 days, 50 samples
npx tsx local/eval-search-llm.ts --days 14 --sample 100
npx tsx local/eval-search-llm.ts --dry-run           # print scores, don't write to DB
```

Scores (1–4) are stored in `search_eval_runs` for month-over-month comparison. Run before/after major search changes.

### Maintaining the golden set

- [ ] Add cases to **`eval/search-golden.json`** when fixing search bugs so regressions are caught in CI.
- [ ] The golden eval also runs locally: `npx tsx local/eval-search.ts` (requires `OPENAI_API_KEY` + Supabase access).

---

## Not done in code yet (optional follow-ups)

- **Stricter rate limits:** move from in-memory per instance to Vercel KV / edge if you need global quotas.
- **Legal:** publish your own Terms of Service and Privacy Policy; see [PRIVACY.md](./PRIVACY.md) for feedback handling notes only.

---

## Changelog (operator-relevant)

| Date | What changed |
|------|----------------|
| 2026-06-04 | **Service vendor specialties:** Apply **`20260604130000_service_categories.sql`** then **`20260604130100_fix_businesses_view_service_categories.sql`** if the first migration errors with `cannot change name of view column "main_image_url" to "embedding"` (Postgres requires `DROP VIEW` + `CREATE VIEW` when `b.*` gained columns). Then: `npx tsx scripts/classify-service-categories.ts --dry-run` → `--apply`. Hub **`/services`** (`?specialty=`); search **`/search?type=services&specialty=plumbing`**. Storefront slug `services` → label **Service businesses** at **`/service-businesses`**. |
| 2026-06-02 | **Sitemap strategy (index focus):** `sitemap.xml` now lists hubs, towns, areas, categories, and guides only — **no `/business/*`** or utility pages. `/guide` **301** → `/guide/ultimate-30a-first-timers-guide`. Validate with **`npm run validate:sitemap`** (add **`--live`** for HTTP/canonical checks). | All indexable routes now use **`openGraphForPage()`** — every page emits **`og:url`**, **`og:image`**, and matching Twitter tags (hero/listing image when available, else default home hero). **Orphan business fix:** category pages list every business (not 4/day rotation); **`/categories`** hub and **`/businesses`** add full text indexes; town/area pages link all browse-visible listings including services/bars. Footer links to **`/guide`** and **`/categories`**. Optional **`INDEXNOW_KEY`** + weekly **`/api/cron/indexnow`**. Ahrefs site verification meta tag in root layout. |
| 2026-06-02 | **SEO / Ahrefs hygiene:** `/guide` now emits complete Open Graph + Twitter tags (hero image). Footer adds permanent links to **`/guide`** and **`/categories`**. Optional **`INDEXNOW_KEY`** + weekly **`/api/cron/indexnow`** for Bing IndexNow. Ahrefs site verification meta tag in root layout. |
| 2026-06-01 | **Business listing copy regeneration:** **`local/regenerate-business-content.ts`** — Maps scrape + shared **`local/lib/business-content/`** prompt (guide-style, non-template headers). Default: no image, outside seaside/rosemary-beach/grayton-beach/carillon-beach. **`local/add-businesses.ts`** uses the same prompt for new inserts. |
| 2026-06-01 | **Search Inspector:** New page at **`/ask/inspect`** — a step-by-step transparent search experience with OpenAI result validation. Enable with **`FEATURE_FLAGS_JSON`** `"search_inspector":true` (auto-on in `NODE_ENV=development`). Uses existing `OPENAI_API_KEY` and logs validation failures to the existing `search_quality_issues` table as `bad_result_report` rows. No new migrations required. |
| 2026-06-03 | **Search quality overhaul (8 phases):** Apply **`20260603000000_search_quality_and_geo.sql`** — adds `businesses.data_quality_score` (default 0.5), updates `hybrid_search_businesses` to return `data_quality_score` + optional `geo_distance_km` (accepts `p_user_lat`/`p_user_lng`). Apply **`20260603120000_search_quality_issues.sql`** — new `search_quality_issues` table + `upsert_zero_result_issue()` function + `v_search_quality_issues_open` view. After applying: (1) `npx tsx local/compute-data-quality.ts` to score existing businesses; (2) `npx tsx local/audit-search-quality.ts` to create initial issue backlog. New admin route: **`/admin/search-debug`** — query debugger showing parsed intent, retrieval path, score breakdowns per result, and confidence score. **Scoring drift fixed:** `lib/search/scoring.ts` is now the canonical shared module for `CATEGORY_TYPE_PATTERNS`, composite scoring, and geo scoring — eval and production use identical logic. Score breakdowns and confidence are **always-on** in API responses (not dev-only). Zero-result searches auto-create `search_quality_issues` rows. Golden test set expanded to **143 cases**. |
| 2026-06-02 | **Ask editorial search:** Apply **`20260602120000_editorial_search.sql`** after the Ask migration — extends **guides** FTS to include body text, adds **`search_vector`** on **towns** and **areas**. Rebuilds guides index (brief lock on `guides` during `DROP COLUMN search_vector`). |
| 2026-06-01 | **Ask Engine:** Apply **`20260601120000_ask_engine.sql`** (includes `set_date_updated_to_now()` if **`20260426120000_date_updated_triggers.sql`** was skipped). Also ensure **`20260426120000_date_updated_triggers.sql`** is applied for businesses/towns/guides triggers. — `ask_conversations`, `ask_messages`, `ask_artifact_sessions`, `artifact_shares`, `ai_feedback`, `human_review_tasks`, `conversation_events`, `security_events`, guides FTS. Set **`FEATURE_FLAGS_JSON`** **`"ask":true`**, **`OPENAI_API_KEY`**, optional **`UPSTASH_*`**, **`ASK_API_SECRET`**, **`WORKFLOW_SECRET`**. Install **`workflow`** (Next config uses **`withWorkflow`**). |
| 2026-05-29 | **Service listings search filter:** Apply **`20260529120000_hybrid_search_service_filter.sql`** — adds optional `p_is_service_business` to `hybrid_search_businesses` so `/search?type=services` and the **Listing type** sidebar filter can separate storefronts from regional services. |
| 2026-05-29 | **Vendors import:** `npx tsx scripts/import-services-csv.ts --vendors --apply --embeddings` imports `docs/vendors.csv` as **`services`** category (`primary_category_id` = services, `is_service_business=true`). Dedupe report: `docs/vendors-import-report.md`. Re-run gap-only embeddings: `npx tsx local/generate-embeddings.ts`. |
| 2026-05-29 | **Indexing hygiene:** Sitemap intent URLs (`seo_pages`) only emit when `query_cache` has non-empty recommendations (avoids sitemap 404s). All `/search` and `/share/[id]` routes set `noindex, follow`. Town pages use `titleSegmentForLayoutTemplate` to avoid doubled `| WhereTo30A` in SERP titles. |
| 2026-05-29 | **Vercel Hobby cron:** `/api/cron/search-stats` schedule changed from hourly (`0 * * * *`) to **once daily at 11:00 UTC** (`0 11 * * *`). Hobby only allows cron expressions that fire once per day; use Pro or an external scheduler if you need hourly `refresh_search_cluster_business_stats()`. |
| 2026-05-27 | **Self-learning search loop (full implementation):** Apply migrations `20260528120000_search_learning_signals.sql` (impressions + clicks + cluster stats), `20260529000000_search_eval_runs.sql` (LLM-judge score table), and `20260529000100_search_monitoring_views.sql` (3 monitoring views). Set `SEARCH_LEARNING_ENABLED=true` in Vercel + `.env.local`. New hourly cron `/api/cron/search-stats` calls `refresh_search_cluster_business_stats()` — confirm `CRON_SECRET` is set. New click API: `POST /api/search/click`. GitLab CI gate in `.gitlab-ci.yml` runs golden eval (`eval/search-golden.json`) on every MR touching `lib/search/**` — add `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_KEY`, `OPENAI_API_KEY` to GitLab CI/CD variables. Run `npx tsx local/generate-business-intelligence.ts && npx tsx local/generate-embeddings.ts --force` to backfill BI data if not done (required for composite scoring to fire). See **Search quality evals + self-learning loop** section for full runbook. |
| 2026-05-24 | **Search evals plan:** [search-evals-plan.md](./search-evals-plan.md) — DS framework for logging searches/results, golden-set offline evals, online KPIs, and closed-loop tuning via **`SearchRankConfig`**, data backfill, and future RPC modes. **`search_impressions` table not built yet.** |
| 2026-05-24 | **Search API spend:** New env toggles **`SEARCH_QUERY_EMBEDDINGS`** (default on) and **`SEARCH_OPENAI_INTENT_PARSE`** (default on). Query embeddings are LRU-cached per process (identical normalized strings reuse one embedding). **`recommendation-precompute`** and legacy **`buildRecommendationSet`** synthesis are unchanged — they are separate OpenAI usage. |
| 2026-05-24 | **Search / OpenAI usage:** Short queries (≤10 words) that match deterministic keyword intent patterns skip **`parseIntentWithOpenAI`** (no chat completion for that request). **Embeddings** for vector search are unchanged. Longer or unmatched queries still use the model for intent. |
| 2026-05-24 | **Search enrichment:** Added **`local/enrich-search-pipeline.ts`** — one pass runs BI (GPT) only when `qa_document` is missing, then **batched** embeddings. **`local/generate-business-intelligence.ts`**, **`local/generate-embeddings.ts`**, **`local/generate-search-profiles.ts`** default to **`published` + `draft`**; **`--published-only`** narrows scope (replaces **`--include-drafts`**). Shared helpers: **`local/lib/search-enrichment/`**. |
| 2026-05-27 | **hybrid_search_businesses RPC ambiguity:** Apply **`20260527103000_drop_duplicate_hybrid_search.sql`** if PostgREST / `supabase.rpc('hybrid_search_businesses', …)` fails with **`Could not choose the best candidate function`**—the town-adjacency migration introduced a duplicate overload `(text, vector, int, text, text, text[], text)` (category **before** `town_ids[]`) alongside the canonical business-intelligence signature `(…, text, text[], text, text)`. The new migration **`DROP`s** only the stale ordering so one function remains. |
| 2026-05-26 | **Business intelligence + composite search scoring:** Apply **`20260526120000_business_intelligence.sql`** — adds `business_type`, `item_tags`, `dietary_tags`, `meal_period_tags`, `atmosphere_tags`, `occasion_tags`, `qa_document` columns; replaces `hybrid_search_businesses` RPC with multi-town support (`p_town_ids[]`) and new column returns. Run **`local/generate-business-intelligence.ts`** (gpt-4o-mini, one call/business) to populate structured tags + Q&A documents, then **`local/generate-embeddings.ts --force`** to re-embed from Q&A docs. Intent schema expanded: `specific_items[]`, `dietary_needs[]`, `meal_period`, `atmosphere_needs[]`, `occasion`, `query_type`. Search now uses **composite scoring**: `structuredMatch × 0.60 + vecSim × 0.30 + quality × 0.10` when structured intent fields are present; `vecSim × 0.90 + quality × 0.10` for simple keyword queries. Dev mode shows `c:0.xxx v:0.xxx` on result cards. |
| 2026-05-24 | **FTS slug tokens:** New migration **`20260524140000_fts_include_business_slug.sql`** — `search_vector` now includes **`slug`** words (hyphens → spaces) at weight **A** beside title. Apply after **`20260524120000_fts_businesses.sql`** if you use full-text search later. |
| 2026-05-24 | **FTS slug tokens:** Migration **`20260524140000_fts_include_business_slug.sql`** adds **`slug`**-derived tokens to **`businesses.search_vector`** (hyphens → spaces, weight **A**). Run after **`20260524120000_fts_businesses.sql`** if you use FTS. |
| 2026-05-24 | **Local search feature flag:** `next dev` turns **`search` on** automatically when **`FEATURE_FLAGS_JSON`** does **not** include a **`search`** key (`lib/feature-flags-core.ts`). Set **`FEATURE_FLAGS_JSON={"search":false}`** if you need search hidden locally. **`next build && next start`** uses **`NODE_ENV=production`**—search stays off until you enable it in **`FEATURE_FLAGS_JSON`** (or **`ff_overrides`**). |
| 2026-05-24 | **Search enrichment + NL search fix:** (1) NL intent town resolution — `intent.location.town` now resolves to a `town_id` filter so "restaurants near Seaside" returns Seaside results. (2) Focused ilike token — attributes from intent (not the full NL phrase) drive the text match; category+town-only queries skip ilike entirely. (3) **Postgres FTS:** apply `20260524120000_fts_businesses.sql`; set `FTS_SEARCH_ENABLED=true` to activate. (4) **pgvector embeddings:** enable pgvector extension in Supabase dashboard; apply `20260524130000_pgvector_embeddings.sql`; run `npx tsx local/generate-embeddings.ts`. (5) **Enrichment scripts:** `local/backfill-town-id.ts` sets `town_id`; `local/enrich-categories-and-keywords.ts` sets `primary_category_id`, `search_keywords`, `intent_tags`, `price_level` via OpenAI. See **Search quality enrichment** section above. |
| 2026-05-23 | **Sitemap / robots / canonical URL resilience:** `/sitemap.xml` business URLs now come from **`businesses_view`** using the **same browse-visibility filters** as **`/business/[slug]`** (no more sitemap URLs that **`notFound`**). Wrapped sitemap assembly in **try/catch** with **static-hub-only fallback** to avoid crawler 500 spikes; **`revalidate = 3600`** on the route. **`getSiteUrl()`** falls back to **`VERCEL_PROJECT_PRODUCTION_URL`** on Vercel **production** when **`NEXT_PUBLIC_SITE_URL`** is unset. **`robots.txt`** **`Host:`** uses hostname only (**`canonicalSiteHostname()`**). |
| 2026-05-21 | **Social defaults:** Footer **Instagram** / **TikTok** default to **@whereto30a** (`lib/site-social.ts`). Override or hide via **`NEXT_PUBLIC_INSTAGRAM_URL`** / **`NEXT_PUBLIC_TIKTOK_URL`** per env table. |
| 2026-05-21 | **Terms refresh (operators & listings):** **`/terms`** Section 6 now documents directory disclaimers—including automation-assisted copy correction discretion third-party dealings liability carve-outs—with anchors **`#directory-and-business-listings`** and **`#listing-information-scope`**. **`#limitation-of-liability`** anchors Section&nbsp;7. Expanded operator representations + indemnities (§§5&nbsp;&&nbsp;8). **`/about`**, **`/feedback`**, **`/list-your-business`**, **`SiteFooter`**, **`BusinessDirectoryDisclaimer`** (business sidebar) cite those sections. Operators should sanity-check copy with counsel before relying on storefront language alone. |
| 2026-05-21 | **Footer / feedback / legal copy:** Homepage + footer **`Explore all towns`** → **`/search?type=towns`**; footer town lists use a generous cap (**500**) so published towns aren’t silently truncated; **Company** links stack vertically; **Listing feedback** → **`/feedback`** (**`POST /api/business-feedback`** → **`feedback@whereto30a.com`** unless **`FEEDBACK_NOTIFICATION_TO_EMAIL`**). Optional **`FEEDBACK_NOTIFICATION_FROM_EMAIL`**, **`NEXT_PUBLIC_INSTAGRAM_URL`**, **`NEXT_PUBLIC_TIKTOK_URL`**. **About** page expanded (why we built it, disclaimers, data flow Browser → Next server routes → Supabase only). **`/list-your-business`** copy avoids implying Directus in the storefront. |
| 2026-05-21 | **Guide hub search CTA:** The teal **“Ready to Explore?”** block at the bottom of **`/guide`** is **hidden by default**. Set **`FEATURE_FLAGS_JSON`** to include **`"guide_hub_search_callout":true`** (or `ff_overrides` in dev) to show it. |
| 2026-05-21 | **Claim / update listing (email):** Sidebar on **`/business/[slug]`** → **`POST /api/business-claim-email`** (Resend → **`claim@whereto30a.com`** unless **`CLAIM_NOTIFICATION_TO_EMAIL`**). Optional **`CLAIM_NOTIFICATION_FROM_EMAIL`**; else **`LISTING_NOTIFICATION_FROM_EMAIL`**. Validates slug against **`businesses_view`**; no DB persistence. Shares **`LISTING_REQUEST_*`** rate-limit window (**`biz-claim-email:${IP}`** buckets). **`lib/string/escape-html.ts`** extracted for emailed HTML bodies. |
| 2026-05-21 | **List your business → Resend:** **`POST /api/listing-requests`** sends the submission by email via **Resend** (default recipient **`add@whereto30a.com`**; override with **`LISTING_NOTIFICATION_TO_EMAIL`**). Set **`RESEND_API_KEY`** and **`LISTING_NOTIFICATION_FROM_EMAIL`** (verified domain). The form no longer inserts into **`business_listing_requests`**. Rate-limit env vars unchanged. Removed the broken **category** field from **`/list-your-business`**. |
| 2026-05-07 | **Business listing requests:** Apply **`20260506180000_business_listing_requests.sql`** (`business_listing_requests` + RLS, no public policies). New page **`/list-your-business`** and **`POST /api/listing-requests`** (service-role insert, duplicate hints, honeypot, per-IP rate limit). Optional env: **`LISTING_REQUEST_RATE_LIMIT_MAX`**, **`LISTING_REQUEST_RATE_LIMIT_WINDOW_SEC`**, **`DISABLE_LISTING_REQUEST_RATE_LIMIT`**. Operators approve by creating/publishing **`businesses`** rows (Directus or SQL); optional **`resulting_business_id`** on the request row when you add it later. |
| 2026-05-06 | **Header Services nav:** Browse nav **Services** link is hidden by default. Set **`FEATURE_FLAGS_JSON`** to include **`"services_nav":true`** (or use the `ff_overrides` cookie in dev) when you are ready to show it. |
| 2026-04-29 | **SEO canonical URLs:** App sets root `metadataBase` from `getSiteUrl()` + `alternates.canonical` on major routes (home, search with sorted query keys, towns/areas/guides/events/business/town/intent SEO pages, legal). **`/business/{uuid}`** 308-redirects to **`/business/{slug}`** when a slug exists. Set **`NEXT_PUBLIC_SITE_URL`** to your real production origin (one hostname) so canonicals match Search Console property. |
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
