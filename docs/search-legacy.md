# Legacy search stack (`query_cache` + `buildRecommendationSet`)

**Live user search** (`/search`, `POST /api/search`) uses the **minimal pipeline** only:

`runSearch` → `assembleSearchPlan` → `executeSearchFromPlan` → `buildMinimalSearchResult`

See [search-pipeline.md](./search-pipeline.md).

## What is legacy

| Piece | Location | Status |
|-------|----------|--------|
| `buildRecommendationSet` | `lib/search/recommendation-set.ts` | **Not used by live search.** OpenAI `synthesizeWithOpenAI` + `scoreAndRankCandidates` on full business rows. |
| `recommendation-precompute` cron | `lib/cron/recommendation-precompute.ts`, `/api/cron/recommendation-precompute` | **Disabled** (`cronLegacyDisabledResponse`). Would call `buildRecommendationSet` and upsert `query_cache`. |
| `query_cache` table | `supabase/migrations/*query_cache*` | **Still read** by SEO/town surfaces (below). Not written by minimal search. |
| `seo-publish` cron | `lib/cron/seo-publish.ts` | **Disabled** at route level (same legacy cron pattern). |

## What still reads `query_cache`

- **`app/[townSlug]/[intentSlug]/page.tsx`** — SEO intent pages load `response_json` via `seo_pages.recommendation_set_id`.
- **`lib/data/town-hub-cache.ts`** — Town hub precomputed sets (if row exists and not expired).
- **`app/api/shares/route.ts`** — Share links reference cached recommendation payloads.
- **`lib/ingestion/refresh-runner.ts`** — Invalidates cache rows when businesses refresh.

These paths expect the **enriched** payload shape from `buildRecommendationSet` (headlines, explanations, `business` objects), not the minimal `SearchResultPayload` card list.

## Retirement options (Phase 5)

1. **SEO read path only** — Keep `query_cache` as a static store; stop calling `buildRecommendationSet` in app code (already true for crons). Backfill/refresh via a one-off script or Directus workflow if needed.
2. **Migrate SEO to minimal pipeline** — Precompute with `runSearch` + store minimal payload; update `TownRecListVertical` / intent page components to render minimal cards. Then drop `synthesizeWithOpenAI` from search entirely.
3. **Delete** — Remove `lib/search/recommendation-set.ts` ranking path, `recommendation-precompute.ts`, and unused cron routes after SEO migration.

## OpenAI spend

- **Minimal search:** intent parse (optional) + query embedding (optional) — see `SEARCH_OPENAI_INTENT_PARSE`, `SEARCH_QUERY_EMBEDDINGS`.
- **Legacy:** `parseIntentWithOpenAI` + `synthesizeWithOpenAI` per precompute job (cron off today).

Do not re-enable precompute without reconciling with the minimal pipeline or you will maintain **two ranking systems**.
