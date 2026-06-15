# Search Eval — Labeling Guide

## Overview

Two-layer eval model:

| Layer | Script | Question |
|---|---|---|
| Query eval | `scripts/eval-search.ts` | For this query, are results right? |
| Data eval | `scripts/eval-search-data.ts` | Is each business findable on its own terms? |

Both layers feed into `scripts/search-preflight.ts` — the single go/no-go gate before enabling search.

## Quick commands

```bash
pnpm run eval:search                          # V1-raw: retrieval quality with correct intent
pnpm run eval:search:v1                       # V1-full: actual production pipeline (~35%)
pnpm run eval:search:v2                       # V2: routing + hybrid RPC (target ≥83%)
pnpm run eval:search:data                     # Data completeness + self-retrieval
pnpm run eval:search:preflight                # Full gate — run before any re-enable discussion
npx tsx scripts/eval-search.ts --query "..."  # Debug one query
npx tsx scripts/eval-search.ts --milestone baseline-N  # Capture dated baseline
```

## Golden case schema (`eval/search-golden.json`)

```jsonc
{
  "id": "regression-coffee-01",          // required — <tier>-<stratum>-<NN>
  "tier": "regression",                  // regression | smoke | stretch
  "stratum": "coffee",                   // see strata table below
  "problemClass": "category_bleed",      // required on regression tier
  "query": "morning coffee",
  "expect": ["Amavida", "3rd Cup"],      // substrings that must appear in top 5
  "notExpect": ["Kilwins", "ONO Surf"],  // substrings that must NOT appear in top 10
  "minResults": 0,                       // 0 = honest empty OK; ≥1 = must return results
  "pollutantClass": "coffee",            // merges eval/pollutants.json[key] into notExpect
  "note": "Why this case exists"
}
```

## Tier meanings

| Tier | CI behavior | When to use |
|---|---|---|
| `regression` | **Blocks merge** if it fails | Production incidents, collision pairs, known bad behavior |
| `smoke` | Warns but does not block | Important quality checks, category isolation |
| `stretch` | Tracked only, never blocks | Aspirational quality, known data gaps |

**Every production incident must produce a `regression` case within 24h.**

## Strata

| Stratum | Examples |
|---|---|
| `single_token_stress` | coffee, restaurant, boutique, bar |
| `coffee` | coffee in rosemary, morning latte, remote work cafe |
| `food_dish` | donuts, crepes, ice cream, gyros |
| `food_general` | casual lunch, best restaurants, brunch |
| `food_town` | tacos seaside, alys beach dining |
| `bars_nightlife` | wine bar, sunset drinks, live music |
| `shopping_retail` | bookstore, swimwear, jewelry |
| `activities_rental` | kayak, golf carts, surf lessons |
| `services` | massage, photographer, private chef |
| `occasion_vibe` | romantic dinner, family fun, date night |
| `dietary` | gluten free, vegan |
| `nl_conversational` | where can I, I'm looking for |

## Adding a new case

1. Find the failure source: run `--query "..."` to see top 10 + scores
2. Classify: data gap → `eval/data-gaps.json`; routing bug → `data/search-query-rules.json` + golden case; ranking → golden case
3. Add to golden JSON with correct `id`, `tier`, `stratum`, `problemClass`
4. For collision classes: add **both** phrases as a pair (the collision and the correct case)
5. Run `pnpm run eval:search:v2 -- --query "..."` to verify the case now passes
6. Run `npm run validate:tags` if you added requiredTags/anyTags to rules

## Collision pairs

Every `substring_collision` problemClass needs **two** golden cases — one for each side:

```jsonc
// WRONG use: golf carts → should NOT return golf courses
{ "id": "regression-collision-mobility-01", "query": "golf carts",
  "notExpect": ["Golf Club", "Golf Course"], "minResults": 0 }

// RIGHT use: golf course → SHOULD return golf courses, not cart rentals
{ "id": "regression-collision-golf-course-01", "query": "golf course tee time",
  "notExpect": ["cart rental", "LSV"] }
```

## Honest empty cases

When a query class has no vendors in the DB yet, set `minResults: 0` and add to `eval/data-gaps.json`:

```jsonc
// golden case
{ "tier": "smoke", "query": "rent a cart", "minResults": 0,
  "notExpect": ["Golf Club", "Golf Course"] }

// data-gaps.json
{ "gap": "mobility_rental", "priority": "high",
  "exampleQueries": ["golf carts", "rent a cart"],
  "status": "missing_vendors", "owner": "product" }
```

## Baseline captures

```bash
# Before any V2 work (V1 state)
npx tsx scripts/eval-search.ts --pipeline v1-full --milestone baseline-0-full

# After Phase 3 RPC
npx tsx scripts/eval-search.ts --pipeline v2 --milestone baseline-3

# Before enabling search flag
npx tsx scripts/eval-search.ts --pipeline v2 --milestone baseline-4
```

Baselines land in `eval/baselines/YYYY-MM-DD_<name>.json` — commit them.

## Maintenance policy

- **Monthly:** add 10 queries from real usage or zero-result logs
- **Quarterly:** prune obsolete cases (closed businesses), review soft eval decay
- **After any search bug fix:** add a regression case before closing the issue
