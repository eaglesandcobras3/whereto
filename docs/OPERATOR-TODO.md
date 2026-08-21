# Operator TODO — Site-wide

General operator tasks for WhereTo30A (env, deploy, shared infra).

**Business Portal** has its own dedicated checklist: [OPERATOR-TODO-business-portal.md](OPERATOR-TODO-business-portal.md).

---

## Vacation rentals marketplace

Direct-booking referral marketplace for vacation rentals (`/stays`), gated by PostHog flag `rentals` (code default **off**; enable only via PostHog). Partner company applications use a separate flag `rental_partners`.

**Runtime data path:** Next.js → **Supabase** (service-role / SSR clients) only. The app does **not** call Directus. Public stays pages use **ISR** (`revalidate`). Admin CRUD is `/admin/rentals` + `/api/admin/rentals*`.

### Setup

- [ ] Apply SQL in Supabase SQL editor: [scripts/migrations/rentals-marketplace.sql](../scripts/migrations/rentals-marketplace.sql)
- [ ] If rentals tables already exist, also apply [scripts/migrations/rentals-optional-business.sql](../scripts/migrations/rentals-optional-business.sql) (makes `business_id` optional; public company profile is opt-in)
- [ ] If rentals tables already exist, also apply [scripts/migrations/rentals-listing-address.sql](../scripts/migrations/rentals-listing-address.sql) (`street_address`, `postal_code`)
- [ ] Confirm storage bucket allows public reads for `rentals/{partner_id}/…` uploads (same media buckets as portal)
- [ ] PostHog: create boolean flag `rentals` (default false); enable for internal cohort then gradual rollout
- [ ] PostHog: create boolean flag `rental_partners` (default false) for `/list-your-rentals/partner` + `/api/rentals/partner-application`
- [ ] Dev bypass (optional): `RENTALS_ENABLED=1` and/or `RENTAL_PARTNERS_ENABLED=1` when `NODE_ENV=development` (client: `NEXT_PUBLIC_RENTAL_PARTNERS_ENABLED=1`)
- [ ] Confirm founding property-manager partners and PMS / booking URL hosts; set `booking_url_hosts` allowlists on partner profiles
- [ ] Storage: partner image URLs or uploads under existing media bucket paths (document path convention `rentals/{partner_id}/…`)
- [ ] Manual freshness cron (optional): `curl -H "Authorization: Bearer $CRON_SECRET" "https://whereto30a.com/api/cron/rentals-freshness"`
- [ ] Regenerate or hand-extend Supabase types after migration (`lib/supabase/database.types.ts` lags portal tables)
- [ ] Optional: if ops still use Directus against the same Postgres, add collections for rental tables (admin UI only — not required for the Next.js app)

### Product notes

- CTA copy: **Check availability** (not Book now) until live sync is trustworthy
- Owner Verified (`businesses.is_verified`) ≠ rental partner approval (`rental_partner_profiles.status`)
- Inventory: **users** submit stays at `/list-your-rentals` (pending review) with **photo upload** + address fields; admins can also create at `/admin/rentals` — no CSV import in MVP
- Review queue: `portal_review_items` types `rental_listing_submission` and `rental_partner_application`
- Not Airbnb-parity: WhereTo30A is a **direct-booking referral** layer (guests check availability on the partner site). Live PMS/API calendar sync is Phase 5 (schema stubs exist; not in public submit yet)
- Address SQL (if tables already exist): [rentals-listing-address.sql](../scripts/migrations/rentals-listing-address.sql)
- Trip spine (future): [docs/rentals-trip-spine.md](rentals-trip-spine.md)

---

## RankScore → Guides sync

Pull completed RankScore articles into `public.guides` (published at `/guide/[slug]` and listed on `/guides`).

### Setup

- [ ] In RankScore: **Integrations → API → Manage** → generate API key (copy once).
- [ ] Add env vars (local `.env.local` and Vercel production):
  - `RANKSCORE_API_BASE` — e.g. `https://dashboard.rankscore.co/api/integrations/v1`
  - `RANKSCORE_API_KEY` — your project API key
  - `CRON_SECRET` — already used by other crons; required for `/api/cron/rankscore-guides`
- [ ] Run SQL migrations in Supabase SQL editor:
  - [scripts/migrations/guides-rankscore-article-id.sql](../scripts/migrations/guides-rankscore-article-id.sql) (`rankscore_article_id`)
  - [scripts/migrations/guides-external-image-urls.sql](../scripts/migrations/guides-external-image-urls.sql) (`main_image_url` / `hero_image_url` for RankScore CDN/Pexels heroes)

### Manual sync (first run / debugging)

```bash
npm run sync:rankscore -- --dry-run   # preview
npm run sync:rankscore -- --limit 5   # small batch
npm run sync:rankscore                # full sync
```

### Scheduled sync (Vercel)

**Removed:** the weekly Vercel cron for `/api/cron/rankscore-guides` was removed from `vercel.json`. RankScore sync remains available **manually**:

```bash
npm run sync:rankscore -- --limit 5
curl -H "Authorization: Bearer $CRON_SECRET" "https://whereto30a.com/api/cron/rankscore-guides?limit=1"
```

### Notes

- Uses RankScore `content_markdown` only (stored in `guides.content`; rendered as markdown on `/guide/[slug]`).
- Hero images: RankScore `hero_image_url` is downloaded to Supabase (`guides/rankscore/{slug}/hero.webp`) and stored on `guides.main_image_url` / `hero_image_url`. Inline markdown images stay as-is.
- Re-sync is **create-only**: existing slugs are skipped; RankScore edits do not overwrite live guides.
- Rate limit: ~1 request/sec to stay under RankScore’s 60 req/min cap.

---

## Index Readiness Scoring Engine (IRSE)

Internal quality score predicting whether a page is likely to be indexed. Product source of truth: [PRD-IRSE.md](PRD-IRSE.md).

Admin UI: `/admin/irse`. Score API: `GET /api/admin/irse/score?kind=&slug=` (optional `&inspect=1`).

On business / guide / town / area pages, signed-in admins see a fixed **IRSE badge** that reads the latest `irse_score_snapshots` row (no scoring API on pageview).

### Setup

- [x] Apply SQL: [scripts/migrations/irse-tables.sql](../scripts/migrations/irse-tables.sql) (`irse_score_snapshots`, `gsc_url_inspections`)
- [ ] GCP: create a service account; enable **Search Console API**
- [ ] Search Console: add the service account email as a user on the property (Full or Restricted)
- [ ] Add env vars (local `.env.local` and Vercel):
  - `GSC_SITE_URL` — e.g. `sc-domain:whereto30a.com` or `https://whereto30a.com/`
  - `GSC_SERVICE_ACCOUNT_EMAIL`
  - `GSC_SERVICE_ACCOUNT_PRIVATE_KEY` — PEM with `\n` for newlines
- [ ] Local CLI also needs `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL` (same as app)
- [ ] Smoke-test: open `/admin/irse`, score a business slug with **Inspect GSC** checked; confirm badge on `/business/[slug]` while signed in as admin
- [ ] Optional: drop leftover SEO audit tables — [drop-seo-audit-tables.sql](../scripts/migrations/drop-seo-audit-tables.sql)

### Calibration & scoring (CLI only)

Not run in CI. Use local CLI against production (or staging) Supabase.

**Score every published page** (fills `irse_score_snapshots` for admin badges — no GSC, not limited to CSVs):

```bash
npm run calibrate:irse -- --score-all
# optional: --kinds=business,guide,town,area
# optional: --no-persist  (dry run)
```

**CSV labels (local, no GSC):** put routes in two files, then:

```bash
npm run calibrate:irse -- \
  --indexed=docs/irse-indexed.csv \
  --not-indexed=docs/irse-notindexed.csv \
  --tune-weights
```

Each CSV is a list of paths (`/business/…`, `/guide/…`, …) or a `path`/`url` column. Root aliases like `/grayton-beach` or `/apparel` are resolved the same way the site does (town / category / area). Directory hubs (`/businesses`, `/about`, …) are skipped. IRSE scores every resolved row, compares indexed vs not-indexed averages, and with `--tune-weights` searches a better category mix **on business/guide/town/area only** (excludes thin category hubs), with per-weight caps and baseline regularization. Add `--tune-include-categories` to include category hubs in the tune set. Add `--apply-weights` only when the tuner sets `recommend apply` (writes `lib/irse/weights.ts`).

**GSC sample mode** (calibration metrics only — samples ~100 labeled URLs, not the whole site):

```bash
npm run calibrate:irse
npm run calibrate:irse -- --sample-size=100 --force-inspect
```

### Notes

- IRSE does **not** replace the boolean listing gate in `lib/seo/business-index-readiness.ts`.
- `indexReady` in IRSE means `overallScore >= 80`.
- Do not blast-inspect the whole site with GSC; use on-demand inspect + calibration sampling only. Full-site **scoring** (no GSC) is fine via `--score-all`.
- Town hubs: shared Stay/Eat/Explore SEO titles + high cross-town copy overlap will keep scores below Index Ready until pages are differentiated (and ideally linked from guides).
- The old SEO site audit (CLI / `/admin/seo-audit` / cron) was removed — use IRSE instead.

---

## Search Console + sitemap growth

Business detail pages (`/business/[slug]`) are now eligible for the public sitemap when they pass the existing listing-quality gate.

Town intent pages (`/town/[slug]/[intentSlug]`) and area intent pages (`/area/[slug]/[intentSlug]`) are the same collapsible rollup sections shown on the town/area hub. Each populated section on the hub links to that place-scoped page (not the corridor-wide `/businesses/[rollup]` hub). Empty sections can still render if opened directly. Sitemap entries are added only when a section contains at least one storefront business.

### Setup

- [ ] Complete the IRSE / GSC setup above before relying on business-page sitemap growth in production
- [ ] Run a full IRSE snapshot before first rollout: `npm run calibrate:irse -- --score-all --kinds=business,town,guide,area`
- [ ] After deploy, confirm `/sitemap.xml` now includes quality-gated `/business/[slug]` URLs and populated town/area rollup URLs (`/town/[slug]/[intentSlug]`, `/area/[slug]/[intentSlug]`)
- [ ] In Search Console, monitor coverage separately for:
  - `/business/`
  - `/town/*/*`
  - `/area/*/*`
- [ ] Keep `INDEXNOW_KEY` configured if you want `/api/cron/indexnow` to speed up discovery of updated hubs

### Notes

- The business-page sitemap gate is intentionally data-first: slug + enough text + image + address + category + town (`lib/seo/business-index-readiness.ts`).
- Town and area intent URLs appear in collapsible section links and `/sitemap.xml` only when the matching rollup has at least one business. Empty valid sections can still be opened directly; unknown slugs 404.

---

## Category hub SEO (indexable `/businesses/[slug]`)

Empty/parent/sparse category hubs are omitted from the sitemap and get `noindex` when below 3 listings (always on).

Visible hub substance (inventory-aware editorial, related guides, differentiated browse rollups) is gated by PostHog **`category_hub_seo`** (code default **off**).

### PostHog

- [ ] Create boolean flag `category_hub_seo` (default false); enable for internal cohort then gradual rollout
- [ ] Local bypass: `CATEGORY_HUB_SEO_ENABLED=1` when `NODE_ENV=development`

### Content

- [ ] In Supabase/admin, fill richer `business_categories.excerpt` for priority leaves (restaurants, shopping, coffee_shops, bars, activities, then high-traffic niches) — excerpt wins over generated copy when ≥40 chars
- [ ] After deploy, confirm `/sitemap.xml` lists leaf hubs with inventory only (no empty parents); spot-check a thin hub has `noindex`
- [ ] In Search Console, monitor coverage on **`/businesses/[slug]`** (legacy `/categories/*` staying excluded/noindex is expected)
- [ ] Optional: re-run `npm run calibrate:irse -- --score-all --kinds=category` so admin badges reflect excerpt-backed editorial signals

---

## Cron jobs

There are currently **no scheduled Vercel cron jobs**.

These endpoints remain available for manual/on-demand maintenance only:

- [ ] `/api/cron/cache-prune` — prune expired `query_cache`
- [ ] `/api/cron/search-stats` — refresh search cluster business stats
- [ ] `/api/cron/indexnow` — submit core hub URLs to IndexNow
- [ ] `/api/cron/rankscore-guides` — manual RankScore guide sync

If a future job really needs a schedule, re-add it deliberately and mirror it in both deployment config and this checklist.

---

## Discover: natural-language query expansion (`discover_nl`)

When PostHog `discover_nl` is on (requires `discover`), `/discover?q=…` runs a **hybrid parser** on the server: deterministic rules first, then a low-cost LLM fallback (`gpt-4o-mini`, `temperature: 0`) when expansion is incomplete or terms do not map to `search_tags_vocabulary`. The navbar passes raw `q` — expansion happens on page load (redirect to structured params).

With `discover` on, the navbar search icon opens a text field (same pattern as legacy search) that routes queries to `/discover`.

### PostHog

- [x] Boolean flag `discover_nl` (requires `discover`) — rolled out
- [ ] Create alert on `discover_tag_unresolved` — use `npm run posthog:setup-trends-alerts` or [posthog-trends-alerts.md](posthog-trends-alerts.md)
- [ ] Optional: `discover_nl_parsed` / LLM fallback trends — provisioned by the same script

### Supabase

- [ ] Apply [scripts/migrations/discover-search-gaps.sql](../scripts/migrations/discover-search-gaps.sql)
- [ ] Review open gaps at `/admin/discover-gaps`

### Local dev

```bash
DISCOVER_ENABLED=1 DISCOVER_NL_ENABLED=1 npm run dev
```

Requires `OPENAI_API_KEY` for LLM fallback (deterministic-only without it).

### Debug API

`POST /api/discovery/parse-query` with `{ "query": "froyo near grayton" }` returns `parsed`, `telemetry` (`resolver`, `deterministic_confidence`, `doubt_reasons`, `confused_terms`, `used_llm`).

---

## Discover: `businesses_view` + `search_tags`

`/discover` reads `search_tags` from `businesses_view` for facet filtering and tag chips on result cards. PostgreSQL views using `SELECT b.*` do **not** pick up columns added to `businesses` later — recreate the view after search-document migrations.

### Apply (Supabase SQL editor)

- [ ] Run [scripts/migrations/businesses-view-search-tags.sql](../scripts/migrations/businesses-view-search-tags.sql)
- [ ] Run [scripts/migrations/drop-search-tags-vocabulary-aliases.sql](../scripts/migrations/drop-search-tags-vocabulary-aliases.sql) — drops unused `search_tags_vocabulary.aliases` and `parent_class` (canonical tags already cleaned; runtime only uses `tag`)

### Verify

```sql
SELECT search_tags FROM public.businesses_view LIMIT 1;
```

Discover should load without `column businesses_view.search_tags does not exist`.

---

## Search tags ↔ subcategory links

Free intake suggests tags when a leaf category is picked. Mapping lives in `search_tag_categories`, seeded from [tags-cats.csv](tags-cats.csv).

### Apply (Supabase SQL editor)

- [x] Run [scripts/migrations/search-tag-categories.sql](../scripts/migrations/search-tag-categories.sql)
- [x] Seed / resync: `npx tsx scripts/import-tag-categories-csv.ts` (optional `--dry-run`)

### Verify

```sql
SELECT count(*) FROM public.search_tag_categories;
```

Expect ~1855 rows after import. Free onboard form shows “Suggested for this category” chips after picking a subcategory.

---

## Backfill: business search enrichment

Published businesses need **category**, **search profile** (tags + `search_profile` + `qa_document`), **derived search document** (`search_tags`, `search_terms`, `embedding_summary`), and an **embedding** vector to show on town pages and rank in search.

### Prerequisites

- `OPENAI_API_KEY` in `.env.local` (or shell env)
- Supabase service key + URL

### Run

```bash
# Preview one business
npx tsx scripts/backfill-business-enrichment.ts --dry-run --id <uuid>

# Full backfill (recommended)
npx tsx scripts/backfill-business-enrichment.ts --dry-run
npx tsx scripts/backfill-business-enrichment.ts --apply

# Heuristics only (category + business_type + derived fields, no OpenAI)
npx tsx scripts/backfill-business-enrichment.ts --apply --skip-ai

# Embeddings only (after profiles exist)
npx tsx scripts/generate-business-embeddings.ts --apply
```

### Verify

```bash
npx tsx scripts/eval-search-data.ts
```

- [ ] Dry-run enrichment, spot-check Mignot&Co and other Grayton Beach gaps
- [ ] Run `--apply`
- [ ] Run `eval-search-data.ts` — completeness should approach 95%+
- [ ] Manually fix any unmatched rows from category-only script

### Category-only (fast path)

```bash
npx tsx scripts/backfill-business-categories.ts --apply
```

---

## PostHog trends & alerts

Product analytics project: **455090** on `us.posthog.com`. Full catalog: [posthog-trends-alerts.md](posthog-trends-alerts.md).

### Setup

- [ ] Create PostHog **personal API key** (`insight:read/write`, `alert:read/write`) — not the project ingest key
- [ ] Add to `.env.local`: `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_SUBSCRIBED_USER_ID` (your numeric user id)
- [ ] Preview: `npm run posthog:setup-trends-alerts -- --dry-run`
- [ ] Provision: `npm run posthog:setup-trends-alerts`
- [ ] Connect **Slack** (or email) on alerts in PostHog UI — see [posthog-trends-alerts.md](posthog-trends-alerts.md)
- [ ] Tune alert thresholds after ~1 week of baseline traffic

### Wizard baseline (already exists)

- [x] Dashboard [1673843](https://us.posthog.com/project/455090/dashboard/1673843) — signups, Ask volume, saves, funnel, operator leads

### Page sharing dashboard

Events: `share_button_clicked` (open intent), `share_completed` (method chosen), `share_cancelled` (native dismiss). Catalog: [posthog-trends-alerts.md](posthog-trends-alerts.md#page-sharing).

- [ ] Preview: `npm run posthog:setup-page-sharing -- --dry-run`
- [ ] Provision: `npm run posthog:setup-page-sharing` (creates **Page sharing** dashboard + insights)
- [ ] Confirm insights: clicks, completions, completion rate, by page type / page / method, most-shared businesses/guides/towns/areas
- [ ] Optional: weekly subscription on the Page sharing dashboard

### Alerts to verify (script-provisioned)

- [ ] `discover_tag_unresolved` — any new unresolved NL search term (daily)
- [ ] `discover_low_results` — thin filter results (≤3 one town, ≤5 all/2+ towns); check `filter_key` breakdown (daily)
- [ ] `discover_nl_parsed` low confidence + LLM fallback spike (daily / weekly)
- [ ] `not_found` — 404 spike (>10/day)
- [ ] `$exception` — JS errors (>5/day)
- [ ] Auth failures — sign-in/sign-up errors (>5/day)
- [ ] Listing request, email claim, portal claim, business feedback — any >0 (daily)
- [ ] Ask volume — relative drop >50% week-over-week

### Manual setup (not in script)

See [posthog-trends-alerts.md § Manual setup required](posthog-trends-alerts.md#manual-setup-required). High priority:

- [ ] Slack/email on every alert
- [ ] Ask zero-volume alert on insight MU1NzUK9
- [ ] LLM daily cost alert in AI Observability
- [ ] Funnel: `listing_request_submitted` → `listing_request_received`
- [ ] Funnel: `business_saved` → `business_save_completed`
- [ ] Weekly dashboard subscription (1673843)
- [ ] Review `/admin/discover-gaps` when tag alerts fire

---

## Feature flags (PostHog)

Product visibility flags are boolean keys in PostHog. Code defaults are **off** when PostHog is unavailable.

| Flag | Controls |
|------|----------|
| `search` | `/search`, search API, nav search UI |
| `ask` | `/ask`, Ask API, concierge UI |
| `onboard` | Business portal (`/portal`, admin subscriptions) |
| `search_inspector` | Admin search debug tools |
| `community_tips` | Visitor text tips on business, town, area, and guide detail pages (optional stars); account management; admin moderation at `/admin/community-tips` |
| `area_facts` | Area profile “at a glance” section below the hero (DB-backed metrics, highlights, detail cards; code default **on**) |
| `rentals` | Vacation rentals marketplace (`/stays`, listing intake, admin rentals); code default **off** |
| `rental_partners` | Company partner application at `/list-your-rentals/partner` (separate from `rentals`); code default **off** |
| `business_photos` | Business main + gallery photos (admin main-image upload, portal additional uploads, public gallery modal); code default **off** |
| `admin_business_direct_edit` | Admin `/admin/businesses` direct field edit (writes `businesses` table, bypasses review queue); does **not** change portal owner proposal flow; code default **off** |
| `business_maps` | OpenStreetMap on business detail + storefront pins on town/area/category hubs; code default **off** |
| `town_maps` | OpenStreetMap of place pins (`map_lat`/`map_lng`) on `/towns` and `/areas` hubs; code default **off** (separate from `business_maps`) |
| `town_relationship` | 30A corridor neighbor timeline on `/town/[slug]` above the map (after at-a-glance when present); code default **off** |
| `discover_maps` | Map-first `/discover` UI for **storefront** only (pan/zoom + “Search this area” writes `bbox`/`zoom` URL params); requires `discover`; services stay list-only; code default **off** |
| `feedback` | Visitor “is this wrong?” field flags on unverified business / rental detail pages (admin review queue); code default **off** |

Local dev bypass: set `SEO_IMPROVEMENTS_ENABLED=1` in `.env.local` (development only).

### Listing field feedback setup

- [ ] Apply [scripts/migrations/portal-review-items-listing-field-flag.sql](../scripts/migrations/portal-review-items-listing-field-flag.sql) so `portal_review_items.type` allows `listing_field_flag` (and other types added in app code). Without this, “Suggest an update” returns **Could not save your report.**
- [ ] PostHog: create boolean flag `feedback` (default false); enable for internal cohort then gradual rollout
- [ ] Local dev (optional): `FEEDBACK_ENABLED=1` and `NEXT_PUBLIC_FEEDBACK_ENABLED=1`
- [ ] Smoke-test: with `feedback` on — unverified business/rental section flags; town (header/facts/map), area (header/map), guide (top+bottom content); **Suggest a business · Add a business** once at the bottom of town, area, and category listing blocks; **Suggest a category** once at the bottom of `/businesses`; **Suggest a guide** on `/guides` and on town/area guide blocks; **Suggest an area** on town area blocks; admin queue opens update form or public page

### Business maps setup

- [ ] PostHog: create boolean flag `business_maps` (default false); enable for internal cohort then gradual rollout
- [ ] Local dev (optional): `BUSINESS_MAPS_ENABLED=1` and `NEXT_PUBLIC_BUSINESS_MAPS_ENABLED=1`
- [ ] Smoke-test: business detail + town/area/category hubs show storefront pins when coords exist

### Town / area hub maps setup

- [ ] Apply [scripts/migrations/town-area-map-centers.sql](../scripts/migrations/town-area-map-centers.sql) (ensures `towns`/`areas`.`map_lat`/`map_lng`; backfills from legacy `center_*` / `latitude_center` when needed; seeds known 30A town pins)
- [ ] PostHog: create boolean flag `town_maps` (default false); enable for internal cohort then gradual rollout
- [ ] Local dev (optional): `TOWN_MAPS_ENABLED=1` and `NEXT_PUBLIC_TOWN_MAPS_ENABLED=1`
- [ ] Fill remaining town/area pins in Directus/admin via **`map_lat` / `map_lng`** (same fields as businesses/rentals) — do not use legacy `center_lat` / `latitude_center`
- [ ] Smoke-test: `/towns` and `/areas` show interactive maps above cards when `town_maps` is on; pin popups link to town/area pages

### Town relationship (30A corridor) setup

Directional neighbor distances for the corridor timeline on town detail pages (`town_relationships`). Santa Rosa Beach is seeded `on_corridor = false` and does not show the section.

- [ ] Apply [scripts/migrations/town-relationships.sql](../scripts/migrations/town-relationships.sql) (`public.town_relationships`)
- [ ] Apply [scripts/migrations/town-relationships-seed.sql](../scripts/migrations/town-relationships-seed.sql) (corridor towns + approximate Santa Rosa row)
- [ ] PostHog: create boolean flag `town_relationship` (default false); enable for internal cohort then gradual rollout
- [ ] Local dev (optional): `TOWN_RELATIONSHIP_ENABLED=1` and `NEXT_PUBLIC_TOWN_RELATIONSHIP_ENABLED=1`
- [ ] Smoke-test: with flag on — `/town/rosemary-beach` shows **THE 30A CORRIDOR** above the map (after at-a-glance when present); `/town/sandestin` shows edge (east-only) neighbors; `/town/santa-rosa-beach` hides the section

### Discover maps setup

- [ ] PostHog: create boolean flag `discover_maps` (default false); enable only with `discover` for internal cohort then gradual rollout
- [ ] Local dev (optional): `DISCOVER_MAPS_ENABLED=1` and `NEXT_PUBLIC_DISCOVER_MAPS_ENABLED=1`
- [ ] Smoke-test: `/discover` storefront mode shows map; pan/zoom → **Search this area** updates `bbox`/`zoom` in the URL and refreshes results; Services mode has no map

### Business photos setup

- [ ] Apply [scripts/migrations/businesses-external-image-urls.sql](../scripts/migrations/businesses-external-image-urls.sql) (`main_image_url` / `hero_image_url` on **`businesses`**, recreate `businesses_view` without duplicate resolve aliases)
- [ ] Apply [scripts/migrations/business-photos.sql](../scripts/migrations/business-photos.sql) if `business_photos` table is missing
- [ ] PostHog: create boolean flag `business_photos` (default false); enable for internal cohort then gradual rollout
- [ ] Local dev (optional): `BUSINESS_PHOTOS_ENABLED=1` and `NEXT_PUBLIC_BUSINESS_PHOTOS_ENABLED=1`
- [ ] Confirm storage buckets allow public reads for `portal/{businessId}/…` and `admin/businesses/{id}/…` WebP uploads
- [ ] Smoke-test: admin sets main image via `/admin/review` photo item or free-intake admin upload; portal member uploads additional photo; public `/business/[slug]` shows Photos section + lightbox

**Write path reminder:** always update `public.businesses.main_image_url` / `hero_image_url` (table). Do **not** write image URLs through `businesses_view` (view is read-only / historically aliased Directus resolves).

### Admin direct business edit setup

- [ ] PostHog: create boolean flag `admin_business_direct_edit` (default false); enable for internal admins
- [ ] Local dev (optional): `ADMIN_BUSINESS_DIRECT_EDIT_ENABLED=1` and `NEXT_PUBLIC_ADMIN_BUSINESS_DIRECT_EDIT_ENABLED=1`
- [ ] Smoke-test: with flag on — `/admin/businesses` search → open listing → save fields updates live page without review queue; portal owner edit still creates a proposal
- [ ] With `business_photos` on — admin edit page can upload gallery photos (WebP, approved immediately) and set main image

### Admin add-business Gemini queue

- [x] Apply [scripts/migrations/admin-business-seed-queue.sql](../scripts/migrations/admin-business-seed-queue.sql) (`admin_business_seed_queue` table + RLS deny for anon/authenticated)
- [ ] Confirm `GEMINI_API_KEY` is set in the environment that serves `/admin/add-business` (Vercel / local `.env.local`)
- [ ] Smoke-test: `/admin/add-business` → enqueue storefront + service-only rows → **Apply queue** imports verified rows; unverified land in Needs review → Force apply or Skip

### Town facts (fully ramped)

Town “at a glance” is always on when DB facts exist (no PostHog flag).

- [x] Apply [scripts/migrations/town-facts.sql](../scripts/migrations/town-facts.sql) (new columns on `public.towns`).
- [x] Apply [scripts/migrations/town-facts-seed.sql](../scripts/migrations/town-facts-seed.sql) (initial copy for major corridor towns).
- [ ] Confirm `/town/rosemary-beach` shows the at-a-glance block below the hero when seed data is present.
- [ ] PostHog: archive/remove obsolete `town_facts` flag (no longer read by the app).

### Area facts setup

- [ ] Create PostHog boolean flag `area_facts` (code default **on** when PostHog omits the key; set PostHog to off to disable).
- [ ] Apply [scripts/migrations/area-facts.sql](../scripts/migrations/area-facts.sql) (new columns on `public.areas`).
- [ ] Apply [scripts/migrations/area-facts-seed.sql](../scripts/migrations/area-facts-seed.sql) (initial copy for major area hubs; sourced from former `AREA_PLANNING`).
- [ ] Local dev (optional override): `AREA_FACTS_ENABLED=1` and `NEXT_PUBLIC_AREA_FACTS_ENABLED=1`.
- [ ] Confirm `/area/rosemary-beach-town-center` shows the at-a-glance block below the hero when seed data is present.
- [ ] PostHog: archive/remove obsolete `seo_improvements` flag (no longer read by the app).

### Community tips setup

- [ ] Create PostHog boolean flag `community_tips` (default off).
- [ ] Apply [scripts/migrations/community-tips.sql](../scripts/migrations/community-tips.sql) (`profiles.attribution_city` + `community_tips` table + RLS).
- [ ] Re-apply [scripts/migrations/community-tips.sql](../scripts/migrations/community-tips.sql) in existing environments to enforce `profiles.is_admin` anti-escalation and `community_tips.status='pending'` write checks.
- [ ] Confirm signup requires **City you’re from** (no age) for semi-anonymous attribution.
- [ ] Confirm `/admin/community-tips` is reachable for admins when the flag is on.
- [ ] Local dev: `COMMUNITY_TIPS_ENABLED=1` and `NEXT_PUBLIC_COMMUNITY_TIPS_ENABLED=1`.

Tips stay **pending** until an admin publishes them. Public copy uses “Someone from {city} said…” — never usernames. Default write rate limit: 5 tips / 24h / user (`COMMUNITY_TIPS_RATE_LIMIT_*`).

### Free onboard (fully ramped)

`/list-your-business` and `/admin/review` are always available (no PostHog flag).

- [x] Apply [scripts/migrations/free-onboard-review-queue.sql](../scripts/migrations/free-onboard-review-queue.sql) so `portal_review_items.submitted_by` can be NULL for anonymous intake.
- [ ] Confirm `/admin/review` is reachable for admins.
- [ ] **Unified categories:** apply [scripts/migrations/unified-categories-explorable.sql](../scripts/migrations/unified-categories-explorable.sql), recreate [businesses-view-search-tags.sql](../scripts/migrations/businesses-view-search-tags.sql), then dry-run / apply `npx tsx scripts/migrate-unified-categories.ts` and triage [docs/uncategorized-businesses.csv](uncategorized-businesses.csv).
- [ ] On `/admin/review`, resolve **suggested categories** (create under a rollup or map to existing leaf) before approve when missing.
- [ ] On `/admin/review`, for storefront intakes optionally check **Show on town/area pages** (`is_explorable`).
- [ ] On `/admin/review`, for **suggested tags**: check to promote (optional rename), or uncheck and enter a replacement / leave empty to discard.
- [ ] **Service specialty backfill:** legacy rows may still have only `service_category_id` until the unified migration runs.
- [ ] PostHog: archive/remove obsolete `free_onboard` flag (no longer read by the app).

---

## Guides admin

In-app editor at `/admin/guides` for markdown guides stored in `public.guides`.

### Setup

- [ ] Ensure admin access (`ADMIN_USER_IDS` or `ADMIN_EMAILS`).
- [ ] Set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`, default `gpt-4o-mini`) for the **Enrich** action.
- [x] Apply [scripts/migrations/guides-search-tags.sql](../scripts/migrations/guides-search-tags.sql) (`guides.search_tags`)
- [ ] Apply [scripts/migrations/guide-tags-vocabulary.sql](../scripts/migrations/guide-tags-vocabulary.sql) (`guide_tags_vocabulary` + seed `all_towns`)

### Workflow

1. **New guide** — write markdown, optionally link a town, place (area), and businesses; add **guide tags** (separate vocabulary from business search tags; create new ones from the editor).
2. **Save draft** — content is validated as markdown only.
3. **Enrich** — generates SEO title/description, OG fields, keywords, summary, intent tags, and `custom_fields.search_profile`.
4. **Publish** — blocked until enriched; sets `status=published`, `published_at`, and `is_hidden_from_search=false`. Published guides are always public/SEO-ready (the app ignores soft-hide for guides).

Junction tables: `guide_towns`, `guide_areas`, `guide_businesses`. Business pages prefer guides linked via `guide_businesses`, then town guides.

**Town / area pages:** show published guides linked to that town (or the area’s parent town / the area itself), plus any guide tagged `all_towns`. Cards match the guides hub.

---

## Editorial + listing SEO visibility

Published rows are always public and sitemap-eligible. The app does **not** filter on `is_hidden_from_search` for towns, areas, guides, businesses, events, or POIs. Rentals use `status=published` + active partner (plus index-readiness quality gates). Soft-hide is legacy CMS noise — archive or unpublish to remove something.

### One-time CMS cleanup

- [ ] Run [scripts/fix-directus-visibility.sql](../scripts/fix-directus-visibility.sql) in Supabase SQL editor to clear leftover `is_hidden_from_search=true` on towns/areas/guides/businesses/rentals.

---

## Backfill: business `overview` from content

Copies the opening overview paragraph from `businesses.content` (text before the first `##` heading — the same block labeled **Overview** on business pages) into a dedicated `overview` column. Does **not** call OpenAI or rewrite `content`.

### Apply column

- [x] Run [scripts/migrations/businesses-overview.sql](../scripts/migrations/businesses-overview.sql) in Supabase SQL editor (or `npx supabase db query --linked -f scripts/migrations/businesses-overview.sql`)

### Run backfill

```bash
npx tsx scripts/backfill-business-overview.ts --dry-run
npx tsx scripts/backfill-business-overview.ts --apply
# overwrite existing overview values:
npx tsx scripts/backfill-business-overview.ts --apply --force
```

- [x] Initial backfill applied (2026-07-13): **561** rows populated; **69** had no pre-`##` preamble (left `overview` null)

### Verify

```sql
SELECT count(*) FILTER (WHERE overview IS NOT NULL) AS with_overview,
       count(*) FILTER (WHERE content IS NOT NULL AND content <> '') AS with_content
FROM public.businesses
WHERE archived_at IS NULL;
```

Optional: if Discover (or anything else) needs `overview` on `businesses_view`, re-run [scripts/migrations/businesses-view-search-tags.sql](../scripts/migrations/businesses-view-search-tags.sql) after the column exists.

- [x] Recreated `businesses_view` (2026-07-13) so business detail can select `overview`

---

## Business `is_verified` (community-verified listings)

When a **non-admin** free-onboard add/update (or portal new listing / edit) is approved, `businesses.is_verified` is set to `true`. Verified listings show a badge next to the name and hide the large bottom “Own or manage this business?” CTA; the small update/flag line under the description stays.

### Apply

- [ ] Run [scripts/migrations/businesses-is-verified.sql](../scripts/migrations/businesses-is-verified.sql) in Supabase SQL editor (adds `is_verified` + recreates `businesses_view`)

### Verify

```sql
SELECT is_verified FROM public.businesses_view LIMIT 1;
```

Business detail should load without `column businesses_view.is_verified does not exist`. Existing rows default to `false` until a user-submitted add/update is approved.

---

## Branded transactional emails

Resend (app-sent) templates use MJML under `lib/email/templates/` with shared partials. Preview locally:

```bash
npm run email:preview
# open lib/email/.previews/*.html
```

### Supabase Auth email templates (Dashboard paste)

Auth mail is **not** sent via Resend. Paste HTML from [`lib/email/templates/supabase/`](../lib/email/templates/supabase/) into **Supabase → Authentication → Email Templates**:

| File | Dashboard template | Suggested subject |
|------|--------------------|-------------------|
| `confirm-signup.html` | Confirm signup | Confirm your WhereTo30A account |
| `reset-password.html` | Reset password | Reset your WhereTo30A password |
| `magic-link.html` | Magic Link | Your WhereTo30A login link |
| `invite-user.html` | Invite user | You're invited to WhereTo30A |
| `change-email.html` | Change email address | Confirm your new WhereTo30A email |

- [ ] Paste each template (keep `{{ .ConfirmationURL }}` / `{{ .Email }}` Go vars intact)
- [ ] Set subjects as above
- [ ] Confirm Site URL + redirect allow list include `/auth/callback`
- [ ] Send a test signup confirm + password reset to a real inbox

See also [`lib/email/templates/supabase/README.md`](../lib/email/templates/supabase/README.md).

---

## Directory audit (Gemini Search + Census pins)

Most listings were LLM-invented. Verify facts with **Gemini + Google Search grounding**, rewrite short directory copy, assign **search tags locally** (full vocabulary, no Gemini), then pin storefronts with the **US Census geocoder** (not Google Maps). Do not import until you have reviewed the CSV.

### Setup

- [ ] Add `GEMINI_API_KEY` to `.env.local` (Google AI Studio). New projects cannot use `gemini-2.5-flash`; default is `gemini-3.7-flash`. Optional: `GEMINI_MODEL`. Gemini 3 Search grounding needs **prepaid credits** (or a paid billing account) — free-tier-only keys will 429 with “prepayment credits are depleted.”
- [ ] Export the current directory: `npm run export:businesses`

### Run

```bash
# Smoke-test a handful of rows (resumes into the same outfile)
npx tsx scripts/audit-businesses-gemini.ts --limit 5

# Full pass (safe to re-run; skips rows already marked exists/closed/cannot_confirm/skipped_verified)
npx tsx scripts/audit-businesses-gemini.ts

# Assign search_tags from audited title/category/copy using full local keyword vocab (no LLM)
npm run assign:business-audit-tags

# Replace storefront coordinates from Census (overwrites LLM pins by default;
# skips service-only and unconfirmed/closed rows). Use --keep-existing-pins to fill blanks only.
npm run geocode:businesses-census

# Review docs/businesses-audit-gemini.csv, then:
npx tsx scripts/import-businesses-audit-csv.ts --file docs/businesses-audit-gemini.csv
npx tsx scripts/import-businesses-audit-csv.ts --file docs/businesses-audit-gemini.csv --apply
```

### Notes

- Extra columns `audit_status`, `audit_confidence`, `audit_sources`, `audit_notes` are ignored by import.
- `cannot_confirm` / `closed` keep the original copy so you can decide; `exists` overwrites phone/website/address/copy from Search. Gemini does **not** change `search_tags`.
- Local tag assigner: matches Gemini `audit_suggested_tags` (up to 10 freeform phrases) onto the full vocab, then fills gaps with `TAG_KEYWORD_RULES` on title/category/copy.
- Verified listings are skipped for content. Import still ignores their content and only applies storefront coordinates.
- Do **not** enable Google Maps grounding. Census pins are for OSM maps.

---

## GitLab CI minutes

MR `check` job (lint / unit tests / `next build`) runs on GitLab shared runners.

- [ ] Restore GitLab CI minutes (or switch to own runners) — jobs currently fail immediately with `ci_quota_exceeded`
- [ ] After minutes are restored, remove `allow_failure: true` from `.gitlab-ci.yml` `check` job

Until then, treat **Vercel** preview/build as the production-build gate for MRs.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-21 | GitLab CI shared-runner minutes exhausted — MR `check` set `allow_failure: true` so quota failures do not block; restore minutes then remove allow_failure. Vercel remains the build gate. |
| 2026-08-20 | PostHog `town_relationship` (default off): 30A corridor neighbor timeline on `/town/[slug]` above the map; SQL [town-relationships.sql](../scripts/migrations/town-relationships.sql) + [town-relationships-seed.sql](../scripts/migrations/town-relationships-seed.sql); local bypass `TOWN_RELATIONSHIP_ENABLED` / `NEXT_PUBLIC_TOWN_RELATIONSHIP_ENABLED`. Santa Rosa Beach is off-corridor (section hidden). |
| 2026-08-20 | Admin `/admin/add-business`: queue new listings (title, town/area typeahead, storefront/service), Apply runs Gemini verify + Census + insert; unverified → Needs review (force apply / skip). SQL [admin-business-seed-queue.sql](../scripts/migrations/admin-business-seed-queue.sql) |
| 2026-08-20 | PostHog `admin_business_direct_edit` (default off): `/admin/businesses` search + direct field edit writes `businesses` table (bypasses review queue); portal owner proposals unchanged. Admin gallery upload (approved WebP) stays behind `business_photos`. Local bypass `ADMIN_BUSINESS_DIRECT_EDIT_ENABLED` / `NEXT_PUBLIC_ADMIN_BUSINESS_DIRECT_EDIT_ENABLED` |
| 2026-08-18 | Town/area collapsible section links go to place-scoped intent pages (not `/businesses` rollup hubs); intent pages include the same business-map treatment as category hubs |
| 2026-08-18 | Search Console rollout tightened: business pages can now enter the sitemap when listing-quality checks pass; town/area intent pages publish from populated hub rollups; no scheduled cron required |
| 2026-08-16 | Soft-hide removed for businesses/rentals too — published (+ rental partner active) means public/SEO-ready; SQL clears businesses + rentals |
| 2026-08-16 | Published towns/areas/guides are always SEO-visible — app ignores `is_hidden_from_search` for those tables; admin/RankScore/compiler set the flag false; SQL cleanup [fix-directus-visibility.sql](../scripts/fix-directus-visibility.sql) |
| 2026-08-16 | PostHog `discover_maps` (requires `discover`, default off): map-first storefront `/discover` with “Search this area” → `bbox`/`zoom` URL params; services stay list-only. Local bypass `DISCOVER_MAPS_ENABLED` / `NEXT_PUBLIC_DISCOVER_MAPS_ENABLED` |
| 2026-08-16 | PostHog `category_hub_seo` (default off) gates category hub editorial/guides/rollup differentiation; FAQ block removed; sitemap/noindex for empty hubs stays always on. Local bypass `CATEGORY_HUB_SEO_ENABLED` |
| 2026-08-16 | Category hub SEO: unique inventory-aware editorial/FAQ/guides on `/businesses/[slug]`; rollups link to leaf types; sitemap/noindex gates for empty/parent/sparse hubs; IndexNow pings priority category URLs; `llms.txt` uses canonical `/businesses` paths |
| 2026-08-15 | Ramped cleanup: removed PostHog `seo_improvements` and its gated UI (trip planning, category editorials, related guide modules, and legacy area planning display). Archive the flag in PostHog. |
| 2026-08-15 | Ramped cleanup: removed PostHog `town_facts` and `free_onboard` flags — town at-a-glance and `/list-your-business` + `/admin/review` are always on. Archive those flags in PostHog. |
| 2026-08-15 | PostHog `area_facts`: area “at a glance” section below hero (DB-backed metrics, highlights, detail cards; code default **on**); SQL [area-facts.sql](../scripts/migrations/area-facts.sql) + [area-facts-seed.sql](../scripts/migrations/area-facts-seed.sql); wins over `seo_improvements` planning fallback when facts exist; IRSE area scoring uses DB facts |
| 2026-08-14 | Town/area hub maps + discovery + content-compiler use **`map_lat` / `map_lng`** only (same as businesses/rentals). Re-apply [town-area-map-centers.sql](../scripts/migrations/town-area-map-centers.sql) to backfill from legacy `center_*` / `latitude_center` if needed. |
| 2026-08-14 | Gemini audit suggests up to 10 freeform tags (`audit_suggested_tags`); local assigner matches them to vocab then keyword-fills. |
| 2026-08-14 | Directory audit: Gemini no longer assigns final `search_tags`; local `assign-business-audit-tags.ts` uses full keyword vocabulary after copy is verified. |
| 2026-08-14 | Directory audit default model → `gemini-3.7-flash` (Gemini 3 Search grounding requires prepaid; ~550 listings typically well under $10). |
| 2026-08-14 | Census geocode defaults to **overwrite** existing storefront pins (LLM-invented coords); `--keep-existing-pins` fills blanks only. |
| 2026-08-13 | Directory audit CLI: Gemini Search grounding (`GEMINI_API_KEY`) rewrites unverified listing facts + copy to `docs/businesses-audit-gemini.csv`; Census geocoder fills storefront pins. Do not use Google Geocoding/Maps grounding. |
| 2026-08-13 | Listing field feedback: hub suggestions — missing business (town/area/category sections + add link), missing category on `/businesses` rollups, missing guide on `/guides` |
| 2026-08-13 | Listing field feedback: widen `portal_review_items.type` CHECK for `listing_field_flag` — SQL [portal-review-items-listing-field-flag.sql](../scripts/migrations/portal-review-items-listing-field-flag.sql) (drops existing type check, including Postgres `= ANY` form). Without it, visitor reports 500 with “Could not save your report.” |
| 2026-08-12 | PostHog `rental_partners`: partner application at `/list-your-rentals/partner` (+ API) split from `rentals`; local bypass `RENTAL_PARTNERS_ENABLED` / `NEXT_PUBLIC_RENTAL_PARTNERS_ENABLED` |
| 2026-08-12 | PostHog `town_maps`: interactive OSM place pins on `/towns` + `/areas` hubs (separate from `business_maps`); SQL [town-area-map-centers.sql](../scripts/migrations/town-area-map-centers.sql); local bypass `TOWN_MAPS_ENABLED` / `NEXT_PUBLIC_TOWN_MAPS_ENABLED` |
| 2026-08-12 | PostHog `feedback`: visitor section reports on unverified business/rental + town/area/guide pages → admin review (`listing_field_flag`); local bypass `FEEDBACK_ENABLED` / `NEXT_PUBLIC_FEEDBACK_ENABLED` |
| 2026-08-12 | PostHog `business_maps`: OpenStreetMap on storefront business detail + multi-pin maps on town/area/category hubs (storefronts with coordinates only); Leaflet for multi-pin; local bypass `BUSINESS_MAPS_ENABLED` / `NEXT_PUBLIC_BUSINESS_MAPS_ENABLED` |
| 2026-08-12 | PostHog `business_photos`: admin main-image update + portal additional photos (WebP max 1600px); public profile gallery + lightbox; SQL [businesses-external-image-urls.sql](../scripts/migrations/businesses-external-image-urls.sql) + [business-photos.sql](../scripts/migrations/business-photos.sql). Writes target `businesses` table URL columns (not view aliases). Rentals listing form: remove hero URL fallback; main + additional photo fields. |
| 2026-08-12 | Rentals listing form: **photo upload** + address fields (`street_address`, `postal_code`, community, lat/lng, precision); SQL [rentals-listing-address.sql](../scripts/migrations/rentals-listing-address.sql). PMS/API sync still deferred (referral marketplace, not Airbnb clone) |
| 2026-08-12 | Rentals: public **list a vacation rental** at `/list-your-rentals` (creates `pending_review` listing); partner-only form at `/list-your-rentals/partner`; admin create retained at `/admin/rentals` |
| 2026-08-12 | Rentals: public PM company profile is **optional** — SQL [rentals-optional-business.sql](../scripts/migrations/rentals-optional-business.sql); partner apply no longer requires listing a business first |
| 2026-08-11 | Vacation rentals marketplace: PostHog `rentals` flag (default off); SQL [rentals-marketplace.sql](../scripts/migrations/rentals-marketplace.sql); `/stays` ISR via Supabase (not Directus); manual admin inventory (no CSV); `/list-your-rentals`, `/admin/rentals`, booking redirect + referral clicks |
| 2026-08-04 | Town at-a-glance: `town_facts` wins — removed hardcoded `seo_improvements` town planning fallback (`TownPlanningSections` / `town-planning.ts`); `town_facts` code default **on**; IRSE town scoring uses DB facts |
| 2026-08-04 | `free_onboard` code default is now **on** (PostHog can still force off); owner-verified tooltip copy updated |
| 2026-08-04 | Business `is_verified`: set on approved non-admin free-onboard add/update (and portal new listing/edit); verified badge on detail page; hide bottom owner CTA. SQL [businesses-is-verified.sql](../scripts/migrations/businesses-is-verified.sql) |
| 2026-08-04 | Security hardening: `/api/ask/inspect/*` now requires env-based admin identity + rate limiting; `/api/ask/share` now requires authenticated, server-bound artifact sessions; `community-tips.sql` now blocks `profiles.is_admin` client escalation and enforces pending-only user writes |
| 2026-08-04 | PostHog `town_facts`: town “at a glance” section below hero (metrics, highlights, detail cards); SQL [town-facts.sql](../scripts/migrations/town-facts.sql) + [town-facts-seed.sql](../scripts/migrations/town-facts-seed.sql) |
| 2026-08-01 | Page sharing: Share button on town/area/business/guide pages (Web Share API + Copy Link / Email fallback); PostHog `share_button_clicked` / `share_completed` / `share_cancelled`; provision with `npm run posthog:setup-page-sharing` |
| 2026-07-30 | Tag↔subcategory links: `search_tag_categories` + import from [tags-cats.csv](tags-cats.csv); free intake suggests mapped tags (+/check) toward the 6-tag cap. SQL [search-tag-categories.sql](../scripts/migrations/search-tag-categories.sql) |
| 2026-07-29 | IRSE town calibration: penalize templated Stay/Eat/Explore SEO titles and near-duplicate hub copy; require guides/areas for discovery; removed free template points. `/town/watersound` no longer labeled indexed via root `/watersound` alias. |
| 2026-07-29 | IRSE: removed GitHub `calibrate-irse` job — CLI only. Use `npm run calibrate:irse -- --score-all` to snapshot every published page for admin badges. |
| 2026-07-29 | IRSE CSV calibration: `--indexed` / `--not-indexed` route lists, `--tune-weights` / `--apply-weights` for category mix search |
| 2026-07-29 | Removed SEO site audit (CLI, admin, cron). IRSE admin badge on business/guide/town/area pages from snapshots. Optional [drop-seo-audit-tables.sql](../scripts/migrations/drop-seo-audit-tables.sql) |
| 2026-07-29 | Drop unused `search_tags_vocabulary.aliases` and `parent_class` — cleanup metadata; runtime only uses canonical `tag`. SQL [drop-search-tags-vocabulary-aliases.sql](../scripts/migrations/drop-search-tags-vocabulary-aliases.sql) |
| 2026-07-29 | PostHog `community_tips`: moderated visitor text tips (optional stars) on business/town/area/guide pages; city required at signup for semi-anonymous attribution; admin `/admin/community-tips`; SQL [community-tips.sql](../scripts/migrations/community-tips.sql) |
| 2026-07-18 | IRSE MVP: score business/guide/town/area/category; admin `/admin/irse`; GSC URL Inspection + calibration (`npm run calibrate:irse`); SQL [irse-tables.sql](../scripts/migrations/irse-tables.sql) |
| 2026-07-17 | Combined Businesses + Services hubs: `/businesses` shows all listings; `/services` permanently redirects to `/businesses`. Nav/footer drop separate Services. |
| 2026-07-17 | Unified categories: `business_categories` becomes rollup+leaf taxonomy from `docs/categories.csv`; deprecate `service_category_id`; add `is_explorable` for town/area; free intake allows storefront+service; hubs: `/categories` (all), `/businesses` (combined directory). Run SQL + `npx tsx scripts/migrate-unified-categories.ts`. |
| 2026-07-16 | Free intake: submitters can **suggest a missing category/specialty** (stands in for the select); `/admin/review` can create it or map to existing on approve. Suggested tags now support promote/rename, replace, or discard. New categories still need a browse-group slug mapping for hubs. |
| 2026-07-16 | Branded all outbound email: MJML for portal invite/rejects/payments + admin-alert ops mail; Supabase Auth HTML paste templates in `lib/email/templates/supabase/`. |
| 2026-07-16 | Services hub: UI-only **Other** bucket (`/services/uncategorized`) surfaces `is_service_business` listings with null specialty — hub section + footer when count &gt; 0. Not a DB `other` slug. |
| 2026-07-16 | Free intake: service / no-location path now requires a **service specialty** (`service_category_id`) so listings show under Services footer + `/services` hub groups. Legacy storefront catch-all `services` removed from the form picker. Backfill any pre-fix approved service intakes missing a specialty. |
| 2026-07-16 | Business transactional emails: MJML templates (teal header/logo, beach-towns banner, Instagram/TikTok/website footer) for request received / approved / listing-or-updates live. Assets in `public/email/`. Preview: `npm run email:preview`. Uses existing Resend + social URL env vars. |
| 2026-07-15 | Free intake: submitters can propose **suggested tags** (shared 6-tag budget); admins promote selected ones into `search_tags_vocabulary` and onto the listing from `/admin/review` on approve |
| 2026-07-14 | Guide tags: separate `guide_tags_vocabulary` (create from admin); town/area pages show hub-style guide cards from town/area links + `all_towns` |
| 2026-07-14 | PostHog `free_onboard`: no-account multi-location intake → `portal_review_items`; admin create/skip per location; submitter emailed when live/rejected; SQL [free-onboard-review-queue.sql](../scripts/migrations/free-onboard-review-queue.sql) |
| 2026-07-14 | `seo_improvements`: removed related-guide modules from town/area pages, intent-cluster grouping on `/guides`, and towns-hub travel-style guide links |
| 2026-07-13 | Guides: fixed town/area pickers (`title`); added `guides.search_tags`; admin tag chips + list search; business pages prefer `guide_businesses` |
| 2026-07-13 | Business detail: show `overview` paragraphs instead of full content collapsible sections; recreated `businesses_view` to expose `overview` |
| 2026-07-13 | Business `overview` column + backfill from content preamble (`scripts/migrations/businesses-overview.sql`, `scripts/backfill-business-overview.ts`) |
| 2026-07-07 | Removed orphan town intent pages (`seo_pages`, `/[townSlug]/[intentSlug]`) and unused `content_entries` overlay |
| 2026-07-07 | Cron cleanup: removed dead disabled `/api/cron/*` routes and removed all scheduled Vercel crons; remaining cron-style routes are manual/on-demand only |
| 2026-07-06 | PostHog: expanded provisioner (exceptions, claims, feedback, NL confidence); manual-setup table in posthog-trends-alerts.md |
| 2026-07-06 | Discover: PostHog `discover_low_results` when active filters return thin listings; town-aware thresholds |
| 2026-07-06 | PostHog trends & alerts: `scripts/posthog-setup-trends-alerts.ts`, [posthog-trends-alerts.md](posthog-trends-alerts.md) |
| 2026-07-05 | Discover NL: PostHog `discover_nl_parsed` event — resolver, confidence, doubt_reasons, confused_terms |
| 2026-07-05 | Discover NL: hybrid LLM tag resolver under `discover_nl`, `discover_search_gaps` table + `/admin/discover-gaps`, PostHog `discover_tag_unresolved` |
| 2026-07-04 | PostHog `seo_improvements` flag gates new SEO sprint UI (hubs, town/guide modules, homepage trip planning) |
| 2026-07-04 | Discover navbar: search icon opens query panel (routes to `/discover`) when `discover` flag is on |
| 2026-07-04 | Removed PostHog `guides` feature flag — guides are always on (pages, nav, sitemap) |
| 2026-07-04 | Discover NL: PostHog `discover_nl` flag parses natural-language queries into `/discover` filter params |
| 2026-07-03 | Discover fix: recreate `businesses_view` so `search_tags` is exposed — [businesses-view-search-tags.sql](../scripts/migrations/businesses-view-search-tags.sql) |
| 2026-06-30 | Guides admin at `/admin/guides` — markdown editor, town/area/business links, AI enrich, publish gate |
| 2026-06-30 | Removed scheduled SEO audit from `vercel.json` — use `npm run audit:seo -- --live` manually |
| 2026-06-29 | SEO site audit cron (`/api/cron/seo-audit`, Mon/Thu); admin `/admin/seo-audit`; `npm run audit:seo`; removed weekly RankScore guides cron from `vercel.json` |
| 2026-06-29 | Added PostHog `guides` feature flag — gates guide UI visibility and sitemap inclusion |
| 2026-06-25 | Full search enrichment backfill (`backfill-business-enrichment.ts`, `generate-business-embeddings.ts`); portal intake sets category + business_type + derived search fields; uncategorized businesses show in "More local spots" |
| 2026-06-19 | RankScore → guides sync: env vars, SQL migration, cron `/api/cron/rankscore-guides`, `npm run sync:rankscore` |
| 2026-06-17 | Created site-wide stub; portal checklist split to OPERATOR-TODO-business-portal.md |
