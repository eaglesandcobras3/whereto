# Operator TODO — Site-wide

General operator tasks for WhereTo30A (env, deploy, shared infra).

**Business Portal** has its own dedicated checklist: [OPERATOR-TODO-business-portal.md](OPERATOR-TODO-business-portal.md).

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

**Removed:** the weekly Vercel cron for `/api/cron/rankscore-guides` was replaced by the SEO site audit cron. RankScore sync remains available **manually**:

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

## SEO site audit (CLI)

Automated crawl: indexability, titles/meta, H1s, canonicals, JSON-LD, OG/Twitter, broken links, sitemap drift, **business listing data quality** (Phase A), robots.txt, and `llms.txt`.

### Run locally

```bash
npm run audit:seo -- --live
```

Writes `docs/seo-audit-report-YYYY-MM-DD.md`. No cron, no database required.

Optional: `?maxUrls=100` is not CLI — use `npm run audit:seo -- --live --max-urls=100`.

### Optional: manual API run or admin history

The route `GET /api/cron/seo-audit` still exists for on-demand runs (requires `CRON_SECRET`). It is **not** scheduled in `vercel.json`.

To store markdown in `/admin/seo-audit`:

- [ ] Apply [scripts/migrations/seo-audit-tables.sql](../scripts/migrations/seo-audit-tables.sql)
- [ ] Set `SEO_AUDIT_STORE_REPORTS=1` on Vercel

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://whereto30a.com/api/cron/seo-audit"
```

---

## Cron jobs

There are currently **no scheduled Vercel cron jobs**.

These endpoints remain available for manual/on-demand maintenance only:

- [ ] `/api/cron/cache-prune` — prune expired `query_cache`
- [ ] `/api/cron/search-stats` — refresh search cluster business stats
- [ ] `/api/cron/indexnow` — submit core hub URLs to IndexNow
- [ ] `/api/cron/seo-audit` — run SEO audit manually
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

### Verify

```sql
SELECT search_tags FROM public.businesses_view LIMIT 1;
```

Discover should load without `column businesses_view.search_tags does not exist`.

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
| `onboard` | Business portal (`/portal`, admin review) |
| `search_inspector` | Admin search debug tools |
| `seo_improvements` | SEO sprint UI: homepage trip-planning section, hub clusters/breadcrumbs, town planning blocks, related-guide modules, category editorial blocks |

Local dev bypass: set `SEO_IMPROVEMENTS_ENABLED=1` in `.env.local` (development only).

---

## Guides admin

In-app editor at `/admin/guides` for markdown guides stored in `public.guides`.

### Setup

- [ ] Ensure admin access (`ADMIN_USER_IDS`, `ADMIN_EMAILS`, or `profiles.is_admin`).
- [ ] Set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`, default `gpt-4o-mini`) for the **Enrich** action.

### Workflow

1. **New guide** — write markdown, optionally link a town, place (area), and businesses.
2. **Save draft** — content is validated as markdown only.
3. **Enrich** — generates SEO title/description, OG fields, keywords, summary, intent tags, and `custom_fields.search_profile`.
4. **Publish** — blocked until enriched; sets `status=published` and `published_at`.

Junction tables: `guide_towns`, `guide_areas`, `guide_businesses`.

---

## Changelog

| Date | Change |
|------|--------|
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
