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

## SEO site audit (cron)

Automated crawl: indexability, titles/meta, H1s, canonicals, JSON-LD, OG/Twitter, broken links, sitemap drift, **business listing data quality** (Phase A), robots.txt, and `llms.txt`.

### Recommended workflow (no database required)

```bash
npm run audit:seo -- --live
```

Writes `docs/seo-audit-report-YYYY-MM-DD.md` locally. This is the primary way to review results.

### Cron (twice weekly)

`GET /api/cron/seo-audit` — Mondays & Thursdays 06:00 UTC. Returns a **JSON summary** every run.

### Optional: store markdown in Supabase

Only if you want history in `/admin/seo-audit`:

- [ ] Apply [scripts/migrations/seo-audit-tables.sql](../scripts/migrations/seo-audit-tables.sql) (single `seo_audit_runs` table — markdown only)
- [ ] Set `SEO_AUDIT_STORE_REPORTS=1` on Vercel
- [ ] `CRON_SECRET` + `NEXT_PUBLIC_SITE_URL` already set

Old runs are **pruned automatically** after each stored run (keeps the latest **6**). No cleanup before each run — a new row is inserted, then older rows are deleted.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://whereto30a.com/api/cron/seo-audit"
```

Optional cap for testing: `?maxUrls=100`

---

## Backfill: business search enrichment

Published businesses need **category**, **search profile** (tags + `search_profile` + `qa_document`), **derived search document** (`search_tags`, `search_terms`, `embedding_summary`), and an **embedding** vector to show on town pages and rank in search.

`scripts/backfill-business-enrichment.ts` runs the full pipeline (OpenAI for missing profiles, then embeddings).

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

## Feature flags (PostHog)

Product visibility flags are boolean keys in PostHog. Code defaults are **off** when PostHog is unavailable.

| Flag | Controls |
|------|----------|
| `search` | `/search`, search API, nav search UI |
| `ask` | `/ask`, Ask API, concierge UI |
| `onboard` | Business portal (`/portal`, admin review) |
| `search_inspector` | Admin search debug tools |
| `guides` | `/guides`, `/guide/[slug]`, Guides nav, home/footer guide CTAs, sitemap guide URLs |

### Guides rollout

- [ ] In PostHog: create boolean feature flag `guides` (default off for gradual rollout).
- [ ] Enable for internal testers, then widen to production when ready.
- [ ] When off: guide pages redirect home, Guides nav item hidden, `/guides` and `/guide/*` omitted from sitemap.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-30 | SEO audit Phase A: business indexability DB checks, events seeds, sitemap reverse coverage, site-wide JSON-LD; storage opt-in via `SEO_AUDIT_STORE_REPORTS` |
| 2026-06-29 | SEO site audit cron (`/api/cron/seo-audit`, Mon/Thu); admin `/admin/seo-audit`; `npm run audit:seo`; removed weekly RankScore guides cron from `vercel.json` |
| 2026-06-29 | Added PostHog `guides` feature flag — gates guide UI visibility and sitemap inclusion |
| 2026-06-25 | Full search enrichment backfill (`backfill-business-enrichment.ts`, `generate-business-embeddings.ts`); portal intake sets category + business_type + derived search fields; uncategorized businesses show in "More local spots" |
| 2026-06-19 | RankScore → guides sync: env vars, SQL migration, cron `/api/cron/rankscore-guides`, `npm run sync:rankscore` |
| 2026-06-17 | Created site-wide stub; portal checklist split to OPERATOR-TODO-business-portal.md |
