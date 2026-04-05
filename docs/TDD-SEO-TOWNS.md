# Technical Design — SEO & Town-Based Recommendations

**Implements** [PRD-SEO-TOWNS.md](./PRD-SEO-TOWNS.md). Phase 1 MVP remains the baseline; this describes **Phase 2** schema and code paths.

---

## 1. Architecture

```mermaid
flowchart LR
  subgraph ingest [Ingestion]
    Places[Places jobs]
    Places --> Biz[businesses]
  end
  subgraph core [Core]
    Rank[scoreAndRankCandidates + location scope]
    Rank --> QC[query_cache / recommendation set]
    QC --> SEO[seo_pages]
  end
  subgraph surfaces [Surfaces]
    AI[/api/search]
    Town[/ townSlug]
    Page[/ townSlug / intentSlug]
    Share[shares]
  end
  AI --> Rank
  CronP[precompute cron] --> Rank
  CronS[seo-publish cron] --> SEO
  Town --> QC
  Page --> SEO
  Share --> QC
```

---

## 2. Data model (implemented in migrations)

### 2.1 `regions`

- `id`, `name`, `slug` (unique)

### 2.2 `towns` (extended)

- `region_id` → `regions(id)` (nullable until backfill)

### 2.3 `town_adjacency`

- `town_id_a`, `town_id_b` (unordered pair, unique) — powers “nearby” multipliers and copy

### 2.4 `businesses` (extended)

- `slug` — unique, URL-safe, for `/business/[slug]`

### 2.5 `query_cache` (recommendation set store)

Existing: `query_hash`, `normalized_query`, `response_json`, `business_ids`, `expires_at`, …

Added:

| Column | Purpose |
|--------|---------|
| `query_key` | Canonical key for SEO dedupe (e.g. `category_restaurants\|town_rosemary-beach`) |
| `intent_type` | Optional label (`browse`, `intent_seo`, …) |
| `town_id` | Scope when town-specific |
| `region_id` | Scope when region-wide |
| `filters` | JSONB intent filters snapshot |
| `scores_snapshot` | JSONB optional debug/audit |
| `seo_eligible` | Promote to `seo_pages` when true |
| `seo_slug` | Last path segment under town (e.g. `restaurants`) |

**Note:** `query_hash` remains the primary cache key for **ad-hoc AI queries**. Programmatic rows use stable `query_key` + scoped ids.

### 2.6 `seo_pages`

- `slug` — **full** URL path unique (e.g. `rosemary-beach/restaurants`)
- `title`, `meta_description`, `content_intro`
- `recommendation_set_id` → `query_cache.id`
- `location_scope` — `town` | `region`
- `town_id`, `region_id` (nullable per scope)
- `published`, `last_generated_at`

### 2.7 `query_logs` (optional / later)

Deferred; use `interactions` + analytics for v1 if sufficient.

---

## 3. Query flow

1. Normalize → `query_key` and/or `query_hash`
2. Lookup `query_cache` by hash or key + scope
3. On miss: fetch businesses → **`scoreAndRankCandidates`** with **location scope multipliers** (see §7)
4. AI synthesis **once** per new row; store in `response_json`
5. SEO: mark `seo_eligible` when thresholds met; `seo-publish` cron creates/updates `seo_pages`

---

## 4. Location-aware ranking (§7 PRD)

Applied as a multiplier on **relevance** before composite score:

| Relationship to page/town context | Multiplier |
|-----------------------------------|------------|
| Same town | 1.0 |
| Adjacent town (`town_adjacency`) | 0.85 |
| Same region, non-adjacent | 0.70 |

Implemented in [`lib/scoring.ts`](../lib/scoring.ts) via `locationScopeForRanking`; unit-tested.

---

## 5. Crons

| Route | Role |
|-------|------|
| `/api/cron/recommendation-precompute` | Build high-value `query_cache` rows (category × town / region) |
| `/api/cron/seo-publish` | Create/update `seo_pages` from eligible sets; optional `revalidateTag` |

Registered in [`vercel.json`](../vercel.json). Auth: same as other crons (`CRON_SECRET`).

---

## 6. Frontend routes (Next.js App Router)

- `/` — region-aware hub (see [`app/page.tsx`](../app/page.tsx) evolution)
- `/[townSlug]` — town or **region** hub if `townSlug` matches `regions.slug` (e.g. `30a`)
- `/[townSlug]/[intentSlug]` — SEO page (data from `seo_pages`)
- `/business/[slug]` — business detail

**Reserved slugs:** [`lib/routes/reserved-slugs.ts`](../lib/routes/reserved-slugs.ts) — return `notFound()` for `api`, `login`, `admin`, `share`, `saved`, `auth`, `business`, etc.

**Rendering:** SEO pages use `generateStaticParams` + `revalidate` (ISR) where data allows; see route modules.

---

## 7. Single pipeline

All surfaces call [`buildRecommendationSet`](../lib/search/recommendation-set.ts) (or `runSearch` which uses it for the ranking segment). **No second copy** of ranking logic for SEO-only paths.

---

## 8. Monitoring (incremental)

- Log cron counts and failures
- Track `seo_pages` generation errors
- Later: Sentry, Search Console, sitemap (Phase 2+)
