# OpenAI Spend Review & Optimization Backlog

_Reviewed 2026-05-27. Search pipeline is still being tuned — these are queued for implementation once the pipeline stabilizes._

---

## What We Call OpenAI For

### Live user search (hot path — every `POST /api/search`)

| Call | File | Model | Est. cost/query |
|------|------|-------|-----------------|
| Query embedding | `lib/search/query-embedding.ts:20` | `text-embedding-3-small` (1536 dims) | ~$0.000001 |
| Intent parse | `lib/ai/search-ai.ts:69` | `gpt-4o-mini` | ~$0.00026 |

The intent parse dominates. At 1,000 searches/day that's ~$8/month; at 10k/day it's ~$80/month. The embedding is negligible at any realistic scale.

**Keyword fast-path** (`shouldSkipOpenAiIntentParse` in `search-ai.ts:311`) skips the intent parse for short, simple queries that match known patterns (coffee, burgers, ice cream, clothing, etc.). This already saves a meaningful fraction of calls.

**Kill switches** are wired:
- `SEARCH_OPENAI_INTENT_PARSE=false` disables intent parsing entirely (keyword heuristics only)
- `SEARCH_QUERY_EMBEDDINGS=false` disables embeddings entirely (ILIKE fallback only)

### Offline / ingestion (not on hot path)

| Call | File | Model | When |
|------|------|-------|------|
| Business intelligence generation | `local/lib/search-enrichment/business-intelligence.ts:84` | `gpt-4o-mini` | Local script, manual runs |
| Discovery plan generation | `lib/ingestion/discovery-planner.ts:51` | `gpt-4o-mini` | Local script, manual runs |
| Result synthesis | `lib/search/recommendation-set.ts:371` | `gpt-4o-mini` | Legacy precompute cron — **currently disabled** |

The disabled synthesis call (`synthesizeWithOpenAI`) sends full candidate business data including `ai_summary` (~280 chars each) to OpenAI. If the precompute cron is ever re-enabled, audit this before turning it on — it can get expensive per town × category job.

---

## Issues Found

### 1. `new OpenAI({ apiKey })` instantiated on every request

**Files:** `lib/ai/search-ai.ts:69`, `lib/ai/search-ai.ts:130`, `lib/search/query-embedding.ts:18`

Each call to `parseIntentWithOpenAI`, `synthesizeWithOpenAI`, and `embedQueryFromApi` creates a fresh `OpenAI` client instance. This allocates a new HTTP client and connection pool on every request.

**Fix:** Hoist to a module-level singleton, lazily initialized with the API key.

```ts
// query-embedding.ts (and same pattern for search-ai.ts)
let _openai: OpenAI | null = null;
function getOpenAI(apiKey: string): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey });
  return _openai;
}
```

---

### 2. In-memory embedding cache is serverless-dead

**File:** `lib/search/query-embedding.ts:4–15`

There is a 256-entry LRU cache + in-flight deduplication. On a persistent Node server this works well. On Vercel serverless, each function instance starts cold — the cache is empty on every cold start, and concurrent warm instances don't share it. In practice the hit rate approaches zero across real traffic.

**Fix:** Persist embeddings to Supabase. The `queryHash` is already computed before the embedding call. A simple `search_query_embeddings` table (columns: `query_hash`, `embedding vector(1536)`, `created_at`) would make any repeated query — across all instances, forever — free after the first hit.

The in-memory cache + in-flight dedup is still worth keeping as an L1 in front of the DB lookup for burst dedup within a warm instance.

---

### 3. Intent parse results are never cached

**File:** `lib/search/recommendation-set.ts:463–487` (`resolveIntent`)

`parseIntentWithOpenAI` is called with no result cache at all — not even in-memory. Every non-keyword query goes to OpenAI on every request. Popular queries like "restaurants near seaside" or "coffee shops" that don't hit the keyword fast-path get parsed fresh every time.

The `queryHash` is already computed in `runSearch.ts` before `resolveIntent` is called, so the cache key exists — it just isn't used.

**Fix:** Add a `search_intent_cache` table (columns: `query_hash`, `intent_json jsonb`, `created_at`, `expires_at`) and check it before calling OpenAI. A 24-hour TTL is conservative; intent for a given query is stable and could be cached for days.

```ts
// sketch in resolveIntent or runSearch
const cached = await supabase
  .from("search_intent_cache")
  .select("intent_json")
  .eq("query_hash", queryHash)
  .gt("expires_at", new Date().toISOString())
  .maybeSingle();

if (cached?.data?.intent_json) return searchIntentSchema.parse(cached.data.intent_json);
// ...else call OpenAI and insert result
```

This one change likely cuts GPT spend by 60–80%+ once the cache warms up on common queries.

---

### 4. `discovery-planner.ts` uses default temperature for structured JSON

**File:** `lib/ingestion/discovery-planner.ts:51`

```ts
// current
model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
messages: [{ role: "user", content: prompt }],
response_format: { type: "json_object" },
// missing: temperature
```

Default temperature is 1.0. For a deterministic JSON-schema output this should be `temperature: 0`. Not a spend issue but produces inconsistent results across runs.

---

## Changes Not Worth Making

**Model choice** — `gpt-4o-mini` is already the right model for intent parsing. `gpt-4.1-nano` / `gpt-4.1-mini` could be evaluated when search is stable, but savings would be marginal.

**Embedding dimensions** — currently 1536 (`text-embedding-3-small` supports down to 512). Reducing dimensions would require reindexing the pgvector column in Supabase and recomputing all stored business embeddings. The embedding API cost is already negligible; not worth the migration risk.

**System prompt compression** — `PARSE_SYSTEM` in `search-ai.ts` is ~800 tokens. OpenAI automatically caches prompt prefixes server-side for `gpt-4o-mini` when the same prefix appears frequently — this is already happening for free given the prompt is a constant string.

**Rate limiting** — already in place (`isSearchRateLimited` is called before any OpenAI work in `app/api/search/route.ts:9`).

---

## Suggested Implementation Order

When ready:

1. **Singleton `OpenAI` client** — trivial, zero risk, do it first
2. **`temperature: 0` in `discovery-planner.ts`** — trivial
3. **Supabase intent cache** — highest spend impact; wire it into `resolveIntent` or just before it in `runSearch`
4. **Supabase embedding cache** — lower priority given embedding cost is near-zero, but completes the picture and removes all redundant API work
5. **Review `synthesizeWithOpenAI` before re-enabling precompute cron** — it sends large payloads; add token estimation / batching limits before turning it back on
