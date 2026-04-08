# WhereTo30A — AI-powered local discovery (implementation plan)

**Product source of truth:** [PRD.md](./PRD.md) defines scope, MVP features, and priorities. This document is the engineering specification. If anything conflicts, implement the PRD and correct this file.

---

## 1. System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js Frontend (Vercel)                        │   │
│  │   • Search Interface  • Results Display  • Share Pages  • Admin UI  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  /api/search     │  │  /api/admin/*    │  │  /api/share/[id]         │  │
│  │  Query handler   │  │  CRUD operations │  │  Cached result retrieval │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│   AI LAYER       │       │   DATA LAYER     │       │   CACHE LAYER        │
│   OpenAI API     │       │   Supabase       │       │   query_cache table  │
│   • Query parse  │◄─────►│   • Postgres DB  │◄─────►│   • TTL management   │
│   • Synthesis    │       │   • Auth         │       │   • Hit tracking     │
└──────────────────┘       │   • Row Security │       └──────────────────────┘
                           └──────────────────┘
                                      ▲
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Cron Jobs (Vercel Cron)                           │   │
│  │   • Discovery Job (nightly)  • Refresh Job (weekly)  • Cache Prune  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│                         ┌──────────────────────┐                            │
│                         │   directory API  │                            │
│                         │   • Text Search      │                            │
│                         │   • Place Details    │                            │
│                         └──────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Principles Enforced by Architecture

| Principle | Enforcement Mechanism |
|-----------|----------------------|
| AI is experience layer only | AI receives structured DB results, never searches externally |
| No hallucinated businesses | Prompt includes ONLY business data from DB; strict output schema |
| Controlled ingestion | All directory API calls via queue-based cron jobs |
| Cost awareness | Cache-first strategy; AI calls minimized to synthesis only |

### Key Data Flows

**Flow 1: User Query**
```
User Input → API Route → Cache Check → [HIT: Return cached]
                                     → [MISS: AI Parse → DB Query → AI Synthesis → Cache → Return]
```

**Flow 2: Data Ingestion**
```
Cron Trigger → Pull from search_jobs queue → directory Places query
            → Dedupe by source id → Place Details → Insert to DB
            → Generate AI Summary → Mark job complete
```

**Flow 3: Share**
```
User clicks share → Generate short UUID → Store in shares table (FK to cache)
                 → Return shareable URL → Recipient loads cached result
```

---

## 2. Data Model

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│     towns       │     │     businesses      │     │      tags       │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK, UUID)       │     │ id (PK)         │
│ name            │────<│ town_id (FK)        │>────│ name            │
│ slug            │     │ listing_external_key (U) │     │ slug            │
│ lat/lng center  │     │ name                │     │ category        │
└─────────────────┘     │ address             │     └─────────────────┘
                        │ lat, lng            │              │
┌─────────────────┐     │ phone               │     ┌────────┴────────┐
│   categories    │     │ website             │     │ business_tags   │
├─────────────────┤     │ price_level         │     ├─────────────────┤
│ id (PK)         │────<│ category_id (FK)    │     │ business_id(FK) │
│ name            │     │ listing_rating       │>────│ tag_id (FK)     │
│ slug            │     │ listing_review_count │     │ source (enum)   │
│ discovery_prio  │     │ hours_json          │     │ confidence      │
└─────────────────┘     │ ai_summary          │     └─────────────────┘
                        │ ai_summary_updated  │
                        │ status (enum)       │
                        │ last_refreshed_at   │
                        │ refresh_priority    │
                        │ created_at          │
                        │ updated_at          │
                        └─────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  search_jobs    │     │  query_cache    │     │   user_saves    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK, UUID)   │     │ id (PK)         │
│ category_id(FK) │     │ query_hash (U)  │     │ user_id (FK)    │
│ town_id (FK)    │     │ normalized_query│     │ business_id(FK) │
│ query_string    │     │ raw_query       │     │ note            │
│ status (enum)   │     │ response_json   │     │ created_at      │
│ priority        │     │ business_ids[]  │     └─────────────────┘
│ last_run_at     │     │ hit_count       │
│ next_run_after  │     │ created_at      │     ┌─────────────────┐
│ error_message   │     │ expires_at      │     │     shares      │
│ created_at      │     └─────────────────┘     ├─────────────────┤
└─────────────────┘                             │ id (PK, short)  │
                                                │ cache_id (FK)   │
                                                │ created_at      │
                                                │ access_count    │
                                                └─────────────────┘
```

### Table Definitions

#### `towns`
```sql
CREATE TABLE towns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  center_lat DECIMAL(10, 7) NOT NULL,
  center_lng DECIMAL(10, 7) NOT NULL,
  search_radius_meters INT DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data: Rosemary Beach, Alys Beach, Seaside, WaterColor, Grayton Beach,
-- Santa Rosa Beach, Inlet Beach, Seacrest Beach, Watersound, Blue Mountain Beach
```

#### `categories`
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  taxonomy_type_hints TEXT[] NOT NULL,  -- hints for tag / category mapping
  discovery_priority INT DEFAULT 5,  -- 1=highest priority for discovery
  refresh_interval_days INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Examples: restaurants, coffee_shops, bars, activities, shopping, services
```

#### `businesses`
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_external_key VARCHAR(255) UNIQUE NOT NULL,

  -- Core info
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  town_id INT REFERENCES towns(id),
  category_id INT REFERENCES categories(id),
  subcategory_id INT REFERENCES subcategories(id),
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,

  -- Contact
  phone VARCHAR(50),
  website VARCHAR(500),

  -- Optional listing metrics (legacy / imports)
  listing_rating DECIMAL(2, 1),
  listing_review_count INT DEFAULT 0,
  price_level INT,  -- 1-4
  hours_json JSONB,
  legacy_photo_refs TEXT[],  -- photo references

  -- AI-generated content
  ai_summary TEXT,
  ai_summary_updated_at TIMESTAMPTZ,
  ai_tags TEXT[],  -- AI-extracted attributes
  best_for TEXT[],  -- use cases: ["family lunch", "date night", "quick coffee"]

  -- Status & freshness
  status VARCHAR(20) DEFAULT 'active',  -- active, hidden, closed, flagged
  suspected_closed BOOLEAN DEFAULT FALSE,
  admin_suppressed BOOLEAN DEFAULT FALSE,
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  refresh_priority INT DEFAULT 5,  -- 1=refresh soon, 10=low priority

  -- Scoring fields (precomputed nightly)
  confidence_score DECIMAL(4, 3) DEFAULT 0.500,  -- 0.000-1.000
  freshness_score DECIMAL(4, 3) DEFAULT 1.000,   -- 0.000-1.000
  engagement_score DECIMAL(4, 3) DEFAULT 0.000,  -- 0.000-1.000
  exploration_score DECIMAL(4, 3) DEFAULT 0.000, -- -0.100 to +0.100
  completeness_score DECIMAL(4, 3) DEFAULT 0.500, -- 0.000-1.000

  -- Engagement stats (aggregated nightly)
  total_impressions INT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  total_saves INT DEFAULT 0,
  total_shares INT DEFAULT 0,

  -- Feedback counts (aggregated)
  bad_experience_count INT DEFAULT 0,
  bad_experience_unique_users INT DEFAULT 0,
  inaccurate_info_count INT DEFAULT 0,
  not_relevant_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_businesses_town ON businesses(town_id);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_location ON businesses USING GIST (
  ll_to_earth(lat, lng)
);
CREATE INDEX idx_businesses_refresh ON businesses(last_refreshed_at)
  WHERE status = 'active';
CREATE INDEX idx_businesses_rating ON businesses(listing_rating DESC NULLS LAST);
CREATE INDEX idx_businesses_confidence ON businesses(confidence_score DESC)
  WHERE status = 'active';
CREATE INDEX idx_businesses_eligible ON businesses(status, suspected_closed, admin_suppressed, confidence_score)
  WHERE status = 'active' AND suspected_closed = FALSE AND admin_suppressed = FALSE;
```

#### `subcategories`
```sql
CREATE TABLE subcategories (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Examples: breakfast, lunch, dinner, brunch (for restaurants)
-- Examples: espresso, drip, specialty (for coffee_shops)
```

#### `tags`
```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,  -- amenity, cuisine, vibe, audience, dietary
  display_order INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Examples by category:
-- amenity: outdoor_seating, pet_friendly, wifi, parking
-- cuisine: seafood, mexican, italian, american
-- vibe: casual, upscale, romantic, family
-- audience: kid_friendly, date_night, groups
-- dietary: gluten_free, vegan, vegetarian
```

#### `business_tags`
```sql
CREATE TABLE business_tags (
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL,  -- taxonomy_hint, directory, ai_inferred, admin_set
  confidence DECIMAL(3, 2) DEFAULT 1.0,  -- 0.00-1.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (business_id, tag_id)
);

CREATE INDEX idx_business_tags_tag ON business_tags(tag_id);
```

#### `search_jobs`
```sql
CREATE TABLE search_jobs (
  id SERIAL PRIMARY KEY,

  -- Job definition
  job_type VARCHAR(20) NOT NULL,  -- discovery, refresh
  category_id INT REFERENCES categories(id),
  town_id INT REFERENCES towns(id),
  query_string VARCHAR(500),
  business_id UUID REFERENCES businesses(id),  -- for refresh jobs

  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, running, completed, failed
  priority INT DEFAULT 5,  -- 1=highest

  -- Scheduling
  last_run_at TIMESTAMPTZ,
  next_run_after TIMESTAMPTZ DEFAULT NOW(),
  run_count INT DEFAULT 0,
  max_runs INT DEFAULT 1,  -- for recurring jobs

  -- Results
  results_count INT,
  new_businesses_count INT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_jobs_pending ON search_jobs(priority, next_run_after)
  WHERE status = 'pending';
CREATE INDEX idx_search_jobs_status ON search_jobs(status);
```

#### `query_cache`
```sql
CREATE TABLE query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Query identification
  query_hash VARCHAR(64) UNIQUE NOT NULL,  -- SHA-256 of normalized query
  normalized_query VARCHAR(500) NOT NULL,
  raw_queries TEXT[],  -- original queries that normalized to this

  -- Response
  response_json JSONB NOT NULL,
  business_ids UUID[] NOT NULL,  -- for invalidation

  -- Analytics
  hit_count INT DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  -- TTL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_query_cache_hash ON query_cache(query_hash);
CREATE INDEX idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_query_cache_hits ON query_cache(hit_count DESC);
```

#### `user_saves`
```sql
CREATE TABLE user_saves (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_user_saves_user ON user_saves(user_id);
```

#### `shares`
```sql
CREATE TABLE shares (
  id VARCHAR(12) PRIMARY KEY,  -- nanoid, URL-friendly
  cache_id UUID REFERENCES query_cache(id) ON DELETE SET NULL,
  query_snapshot JSONB NOT NULL,  -- frozen copy of response
  access_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `impressions` (for engagement tracking)
```sql
CREATE TABLE impressions (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),  -- anonymous session tracking
  query_hash VARCHAR(64),  -- which query showed this result
  rank_position INT,       -- position in results (1-15)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_impressions_business ON impressions(business_id);
CREATE INDEX idx_impressions_created ON impressions(created_at);
CREATE INDEX idx_impressions_query ON impressions(query_hash);

-- Partition by month for performance (implement when needed)
-- CREATE TABLE impressions_2024_01 PARTITION OF impressions
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### `interactions` (clicks, saves, shares)
```sql
CREATE TABLE interactions (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  interaction_type VARCHAR(20) NOT NULL,  -- click, save, unsave, share
  query_hash VARCHAR(64),
  metadata JSONB,  -- additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_business ON interactions(business_id);
CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_type ON interactions(interaction_type);
CREATE INDEX idx_interactions_created ON interactions(created_at);
```

#### `user_feedback` (negative signals — PRIVATE, never shown publicly)
```sql
CREATE TABLE user_feedback (
  id SERIAL PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  feedback_type VARCHAR(30) NOT NULL,  -- had_bad_experience, inaccurate_info, not_relevant, hide_for_me
  feedback_reason VARCHAR(50),         -- structured reason (see below)
  query_context VARCHAR(500),          -- what query triggered this feedback
  intent_context JSONB,                -- parsed intent for context-aware weighting
  notes TEXT,                          -- optional user explanation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id, feedback_type)  -- one feedback type per user per business
);

-- Feedback reasons for 'had_bad_experience':
-- poor_service, bad_quality, closed_inaccurate, too_crowded, not_as_described, other

CREATE INDEX idx_user_feedback_business ON user_feedback(business_id);
CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_recent ON user_feedback(created_at DESC);
```

#### `user_suppressions` (personal hide/block)
```sql
CREATE TABLE user_suppressions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  suppression_type VARCHAR(20) NOT NULL,  -- hide_for_me, had_bad_experience
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id, suppression_type)
);

CREATE INDEX idx_user_suppressions_user ON user_suppressions(user_id);
```

#### `business_scores_history` (for debugging/auditing)
```sql
CREATE TABLE business_scores_history (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  confidence_score DECIMAL(4, 3),
  freshness_score DECIMAL(4, 3),
  engagement_score DECIMAL(4, 3),
  exploration_score DECIMAL(4, 3),
  completeness_score DECIMAL(4, 3),
  negative_feedback_adjustment DECIMAL(4, 3),
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_history_business ON business_scores_history(business_id, computed_at DESC);
```

### Indexing Strategy Summary

| Table | Index Type | Purpose |
|-------|-----------|---------|
| businesses | B-tree on town_id, category_id | Filter queries |
| businesses | GiST spatial | Distance calculations |
| businesses | B-tree on status, rating | Common filters + sorting |
| businesses | Composite on eligibility fields | Fast eligibility filtering |
| businesses | B-tree on confidence_score | Score-based sorting |
| business_tags | B-tree on tag_id | Tag-based lookups |
| search_jobs | Partial on pending status | Queue polling |
| query_cache | Hash on query_hash | O(1) cache lookups |
| impressions | B-tree on business_id, created_at | Engagement rate calculation |
| interactions | B-tree on business_id, type | Interaction aggregation |
| user_feedback | B-tree on business_id | Feedback lookup |
| user_suppressions | B-tree on user_id | Personal suppression check |

---

## 3. Ingestion Pipeline

### Overview

The ingestion system operates in two modes:
1. **Discovery** — Find new businesses via category+town searches
2. **Refresh** — Update existing business data

Both are queue-driven and budget-limited.

### Discovery Pipeline (Step-by-Step)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Generate Discovery Jobs (Admin action or scheduled)                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Input: category_id, town_id                                                 │
│ Output: search_jobs records                                                 │
│                                                                             │
│ Logic:                                                                      │
│ 1. Load category.taxonomy_type_hints (e.g., ["cafe", "coffee_shop"])              │
│ 2. Load town.name and nearby variants                                       │
│ 3. Generate query strings:                                                  │
│    - "coffee shops in Seaside FL"                                          │
│    - "cafes near Seaside Florida 30A"                                      │
│    - "coffee Seaside Beach"                                                │
│ 4. Insert into search_jobs with status='pending'                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Cron Job Polls Queue                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Trigger: Vercel Cron, nightly at 2:00 AM ET                                │
│                                                                             │
│ Logic:                                                                      │
│ 1. SELECT * FROM search_jobs                                               │
│    WHERE status = 'pending'                                                 │
│    AND next_run_after <= NOW()                                             │
│    ORDER BY priority ASC                                                    │
│    LIMIT {NIGHTLY_JOB_BUDGET}  -- e.g., 10                                 │
│ 2. UPDATE status = 'running' for selected jobs                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Execute directory Places query (Geoapify GET)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ For each job:                                                               │
│                                                                             │
│ API Call (example):                                                         │
│   GET https://api.geoapify.com/v2/places?categories=…&filter=circle:lon,lat,│
│   radiusMeters&limit=…&apiKey=…                                             │
│                                                                             │
│ Response: GeoJSON FeatureCollection (place_id, name, lat/lon, categories) │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Deduplicate                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ For each place_id in results:                                               │
│                                                                             │
│ 1. SELECT id FROM businesses WHERE listing_external_key = {place_id}            │
│ 2. If exists → skip (already known)                                        │
│ 3. If not exists → add to new_places queue                                 │
│                                                                             │
│ Batch optimization: Use IN clause for bulk lookup                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Fetch Place Details for New Businesses                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ For each new place_id:                                                      │
│                                                                             │
│ API Call (example):                                                         │
│   GET https://api.geoapify.com/v2/place-details?id={place_id}&apiKey=…     │
│   Returns: contact, website, opening_hours text, geometry, etc.            │
│                                                                             │
│ Rate limiting: stay within provider credits; ~100–200ms between calls    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: Transform & Insert                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Transform API response → businesses table schema                           │
│                                                                             │
│ 1. Map town_id via lat/lng proximity to town centers                       │
│ 2. Map category_id from taxonomy / directory categories                     │
│ 3. Extract tags from category codes → business_tags                        │
│ 4. INSERT INTO businesses with status='active'                             │
│                                                                             │
│ Transaction: Wrap insert + tags in single transaction                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: Generate AI Summary (Async)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Queue AI summary generation for new businesses                             │
│                                                                             │
│ Prompt structure:                                                           │
│   "Generate a 2-sentence summary for a local business listing.             │
│    Business: {name}                                                         │
│    Category: {category}                                                     │
│    Location: {town}                                                         │
│    Rating: {rating} ({review_count} reviews)                               │
│    Price: {price_level}                                                     │
│    Tags: {tags}                                                             │
│                                                                             │
│    Write for someone discovering this place. Be specific and helpful."     │
│                                                                             │
│ Model: gpt-4o-mini (cost-efficient for summaries)                          │
│ Batch: Process up to 10 summaries per job run                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: Update Job Status                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ UPDATE search_jobs SET                                                      │
│   status = 'completed',                                                     │
│   last_run_at = NOW(),                                                      │
│   results_count = {total_results},                                          │
│   new_businesses_count = {new_count}                                        │
│ WHERE id = {job_id}                                                         │
│                                                                             │
│ On error: status = 'failed', error_message = {error}                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Refresh Pipeline

```
Trigger: Nightly cron (after discovery jobs complete)

Logic:
1. SELECT businesses WHERE
   status = 'active' AND
   last_refreshed_at < NOW() - (category.refresh_interval_days * INTERVAL '1 day')
   ORDER BY refresh_priority ASC, last_refreshed_at ASC
   LIMIT {REFRESH_BUDGET}  -- e.g., 20 per night

2. For each business:
   a. Fetch place details from directory API
   b. Compare key fields (rating, hours, status)
   c. If permanently_closed → status = 'closed'
   d. UPDATE business record
   e. Invalidate any query_cache entries containing this business_id

3. Update last_refreshed_at
```

### Query Expansion Logic

For each category+town combination, generate multiple query variants:

```
Input: category="coffee_shops", town="Seaside"

Expansions:
1. "{category} in {town} FL"           → "coffee shops in Seaside FL"
2. "{category} near {town} Florida"    → "coffee shops near Seaside Florida"
3. "{category} {town} 30A"             → "coffee shops Seaside 30A"
4. "best {category} {town}"            → "best coffee shops Seaside"
5. "{alt_term} in {town}"              → "cafe in Seaside FL"

alt_terms pulled from categories.taxonomy_type_hints
```

---

## 4. Scheduling & Cron Strategy

### Job Types & Cadence

| Job Type | Schedule | Budget Per Run | Purpose |
|----------|----------|----------------|---------|
| Discovery | Nightly 2:00 AM ET | 10 search jobs | Find new businesses |
| Refresh | Nightly 3:00 AM ET | 20 businesses | Update existing data |
| AI Summary | Nightly 4:00 AM ET | 15 summaries | Generate missing summaries |
| Cache Prune | Daily 5:00 AM ET | N/A | Delete expired cache entries |
| Popular Cache | Weekly Sun 6:00 AM | 50 queries | Pre-warm popular query cache |

### Budget Calculation

**directory API (Monthly)**
- Discovery: 10 searches/night × 30 days = 300 Text Search calls
- Details per search: ~5 new businesses avg = 1,500 Place Details calls
- Refresh: 20/night × 30 days = 600 Place Details calls
- **Total: ~2,400 calls/month** (well within free tier or minimal cost)

**OpenAI API (Monthly)**
- AI Summaries: 150 new businesses × ~200 tokens = 30K tokens
- Query synthesis: 500 unique queries × ~500 tokens = 250K tokens
- **Total: ~280K tokens/month** (~$0.50 with gpt-4o-mini)

### Queue Execution Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUEUE PROCESSOR                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  function processJobQueue(jobType, budget) {                               │
│    // 1. Claim jobs atomically                                              │
│    const jobs = await db.query(`                                           │
│      UPDATE search_jobs                                                     │
│      SET status = 'running', updated_at = NOW()                            │
│      WHERE id IN (                                                          │
│        SELECT id FROM search_jobs                                           │
│        WHERE job_type = $1                                                  │
│        AND status = 'pending'                                               │
│        AND next_run_after <= NOW()                                          │
│        ORDER BY priority ASC                                                │
│        LIMIT $2                                                             │
│        FOR UPDATE SKIP LOCKED                                               │
│      )                                                                      │
│      RETURNING *                                                            │
│    `, [jobType, budget]);                                                   │
│                                                                             │
│    // 2. Process each job with timeout                                      │
│    for (const job of jobs) {                                               │
│      try {                                                                  │
│        await processWithTimeout(job, JOB_TIMEOUT_MS);                      │
│        await markComplete(job.id);                                          │
│      } catch (error) {                                                      │
│        await markFailed(job.id, error);                                     │
│      }                                                                      │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event-Triggered Refresh Rules

| Trigger | Action |
|---------|--------|
| Business appears in query result | Bump refresh_priority -= 1 |
| User saves business | Bump refresh_priority to 1 |
| Business rating changes >0.3 | Queue immediate re-summary |
| Business hours change | Invalidate related cache entries |
| Admin flags business | Queue manual review, pause from results |

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/discovery",
      "schedule": "0 7 * * *"  // 2 AM ET = 7 AM UTC
    },
    {
      "path": "/api/cron/refresh",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/ai-summaries",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/cache-prune",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/popular-cache",
      "schedule": "0 11 * * 0"  // Sundays
    }
  ]
}
```

---

## 5. AI System Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI SYSTEM ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Query: "Best kid-friendly lunch near Seaside"                        │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STAGE 1: Query Parsing (AI Call #1)                                   │ │
│  │                                                                        │ │
│  │ Input: Raw user query                                                  │ │
│  │ Output: Structured intent object                                       │ │
│  │                                                                        │ │
│  │ {                                                                      │ │
│  │   "category": "restaurants",                                          │ │
│  │   "subcategory": "lunch",                                             │ │
│  │   "location": { "town": "seaside", "radius": "near" },               │ │
│  │   "attributes": ["kid_friendly"],                                     │ │
│  │   "sort_preference": "quality",                                       │ │
│  │   "result_count": 5                                                   │ │
│  │ }                                                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STAGE 2: Database Query (NO AI)                                       │ │
│  │                                                                        │ │
│  │ Convert structured intent → DB fetch + Section 11 pipeline           │ │
│  │ Filter by: town, category, tags, status='active'                      │ │
│  │ Rank: hard eligibility → composite score (NOT rating-only sort)       │ │
│  │ Limit: 15 candidates after scoring + diversity pass                  │ │
│  │                                                                        │ │
│  │ Returns: Full business objects with all metadata                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ STAGE 3: AI Synthesis (AI Call #2)                                    │ │
│  │                                                                        │ │
│  │ Input: Structured intent + candidate businesses (from DB)             │ │
│  │ Output: Final response with recommendations                           │ │
│  │                                                                        │ │
│  │ AI selects top 3-5 from candidates                                    │ │
│  │ Generates personalized explanation for each                           │ │
│  │ Returns structured JSON response                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hallucination Prevention System

**Principle: AI can only SELECT and DESCRIBE — never INVENT**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HALLUCINATION PREVENTION MECHANISMS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. CLOSED CANDIDATE SET                                                     │
│    • AI receives ONLY businesses from DB query results                      │
│    • Prompt explicitly states: "Select ONLY from the businesses provided"  │
│    • Response schema requires business_id (validated against input)        │
│                                                                             │
│ 2. STRUCTURED OUTPUT SCHEMA                                                 │
│    • Response must follow JSON schema                                       │
│    • Each recommendation includes business_id that MUST match input        │
│    • Post-processing validates all IDs exist in candidate set              │
│                                                                             │
│ 3. FACT ANCHORING                                                           │
│    • AI descriptions must reference provided data                           │
│    • "This place has {rating} stars" — rating from DB                      │
│    • "Known for {tag}" — tag from business_tags                            │
│                                                                             │
│ 4. NO EXTERNAL KNOWLEDGE                                                    │
│    • System prompt: "Do not use any knowledge about these businesses       │
│      beyond what is provided in the context."                               │
│    • "If you don't have enough information, say so."                       │
│                                                                             │
│ 5. VALIDATION LAYER                                                         │
│    • Post-AI validation checks:                                             │
│      - All business_ids exist in original candidate set                     │
│      - No business names appear that weren't in candidates                  │
│      - Phone/address/website match DB records                               │
│    • Failed validation → fallback to template response                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prompt Templates

#### Query Parsing Prompt

```
SYSTEM:
You are a query parser for a local business discovery app in 30A, Florida.
Parse the user's natural language query into a structured search intent.

The 30A area includes these towns: Rosemary Beach, Alys Beach, Seaside,
WaterColor, Grayton Beach, Santa Rosa Beach, Inlet Beach, Seacrest Beach,
Watersound, Blue Mountain Beach.

Available categories: restaurants, coffee_shops, bars, activities, shopping, services

Available attributes/tags: kid_friendly, pet_friendly, outdoor_seating,
romantic, casual, upscale, waterfront, live_music, gluten_free, vegan,
vegetarian, seafood, mexican, italian, breakfast, lunch, dinner, brunch

Output JSON only. No explanation.

USER:
{user_query}

EXPECTED OUTPUT:
{
  "category": string | null,
  "subcategory": string | null,
  "location": {
    "town": string | null,
    "radius": "exact" | "near" | "anywhere"
  },
  "attributes": string[],
  "exclude_attributes": string[],
  "sort_preference": "quality" | "distance" | "price",
  "price_level": number | null,
  "result_count": number (default 5, max 10)
}
```

#### Synthesis Prompt

```
SYSTEM:
You are a friendly local insider for 30A, Florida. Your job is to recommend
the best businesses based on what the user is looking for.

CRITICAL RULES:
1. ONLY recommend businesses from the CANDIDATES list provided
2. Do NOT invent or mention any business not in the candidates
3. Select 3-5 best matches from the candidates
4. For each recommendation, explain WHY it matches what they're looking for
5. Use a warm, helpful tone — like a knowledgeable friend
6. If no candidates match well, be honest and suggest broadening the search

Output JSON only following the exact schema.

USER QUERY: {original_query}
PARSED INTENT: {structured_intent}

CANDIDATES (select from these ONLY):
{candidates_json}

OUTPUT SCHEMA:
{
  "recommendations": [
    {
      "business_id": "uuid (MUST match a candidate)",
      "rank": 1,
      "headline": "Short catchy reason (under 10 words)",
      "explanation": "2-3 sentences on why this is a great match",
      "highlighted_tags": ["tag1", "tag2"]
    }
  ],
  "search_summary": "One sentence describing what you found",
  "suggestions": ["optional follow-up queries if results limited"]
}
```

### Response Schema & Validation

```typescript
// Response type definitions
interface AIResponse {
  recommendations: Recommendation[];
  search_summary: string;
  suggestions?: string[];
}

interface Recommendation {
  business_id: string;
  rank: number;
  headline: string;
  explanation: string;
  highlighted_tags: string[];
}

// Validation function
function validateAIResponse(
  response: AIResponse,
  candidateIds: Set<string>
): ValidationResult {
  const errors: string[] = [];

  for (const rec of response.recommendations) {
    // Ensure business_id exists in candidates
    if (!candidateIds.has(rec.business_id)) {
      errors.push(`Invalid business_id: ${rec.business_id}`);
    }
  }

  // Ensure no duplicates
  const ids = response.recommendations.map(r => r.business_id);
  if (new Set(ids).size !== ids.length) {
    errors.push('Duplicate business_id in recommendations');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 6. AI Cost Optimization Plan

### Strategy Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COST OPTIMIZATION HIERARCHY                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Level 1: AVOID AI CALLS ENTIRELY                                          │
│  ├── Cache hit on normalized query                                         │
│  ├── Pre-generated response for popular query                              │
│  └── Template response for simple queries                                  │
│                                                                             │
│  Level 2: MINIMIZE TOKEN USAGE                                              │
│  ├── Use gpt-4o-mini for parsing (not gpt-4o)                             │
│  ├── Compact candidate data (only relevant fields)                         │
│  └── Structured output reduces response tokens                             │
│                                                                             │
│  Level 3: BATCH OPERATIONS                                                  │
│  ├── AI summaries generated in batch (not per-request)                    │
│  ├── Pre-warm cache for common queries                                     │
│  └── Avoid redundant re-generation                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Query Normalization

```typescript
function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    // Remove articles
    .replace(/\b(a|an|the)\b/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Expand common abbreviations
    .replace(/\bw\/\b/g, 'with')
    .replace(/\b&\b/g, 'and')
    // Normalize location references
    .replace(/\brosemary\b/g, 'rosemary beach')
    .replace(/\balys\b/g, 'alys beach')
    // Remove punctuation
    .replace(/[.,!?]/g, '')
    // Sort words for order-independent matching (optional, aggressive)
    // .split(' ').sort().join(' ')
    .trim();
}

function hashQuery(normalized: string): string {
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Examples:
// "Best kid-friendly lunch near Seaside"
// → "best kid-friendly lunch near seaside"
// → hash: "a3f2b1..."

// "The best kid friendly lunches in Seaside!"
// → "best kid friendly lunches in seaside"
// → hash: "a3f2b1..." (same hash!)
```

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CACHE ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CACHE TIERS:                                                               │
│                                                                             │
│  Tier 1: Pre-Generated (TTL: 7 days)                                       │
│  • Top 50-100 popular queries                                              │
│  • Generated weekly by cron job                                            │
│  • Queries identified by: admin seed list + high hit_count                 │
│                                                                             │
│  Tier 2: User-Generated (TTL: 24 hours)                                    │
│  • Any query that misses Tier 1                                            │
│  • Stored after AI synthesis                                               │
│  • TTL extended on each hit                                                │
│                                                                             │
│  Tier 3: Share Links (TTL: 30 days)                                        │
│  • Frozen snapshot when share created                                       │
│  • Never invalidated by data changes                                       │
│  • Long TTL for link longevity                                             │
│                                                                             │
│  INVALIDATION TRIGGERS:                                                     │
│  • Business status change → invalidate caches containing business_id       │
│  • Business data refresh → soft invalidate (serve stale, refresh async)    │
│  • Category-level change → bulk invalidate by category                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### TTL Strategy

| Cache Type | Base TTL | Extension Rule | Max TTL |
|------------|----------|----------------|---------|
| Pre-generated popular | 7 days | Regenerated weekly | 7 days |
| User query (hit) | 24 hours | +12h per hit, up to max | 72 hours |
| User query (no hit) | 6 hours | None | 6 hours |
| Share snapshot | 30 days | None | 30 days |

### Pre-Generated Popular Queries

```typescript
// Seed list of queries to pre-generate
const POPULAR_QUERIES = [
  // Category + location combinations
  "best restaurants in seaside",
  "coffee shops rosemary beach",
  "breakfast near alys beach",
  "dinner watercolor",
  "bars in seaside",

  // Attribute-based
  "kid-friendly restaurants 30a",
  "pet-friendly restaurants",
  "outdoor dining seaside",
  "romantic dinner 30a",
  "gluten-free options",

  // Activity-based
  "things to do with kids",
  "rainy day activities",
  "best happy hour",

  // Planning queries
  "plan a day in seaside",
  "best brunch spots",
  "where to eat seafood"
];

// Weekly cron job
async function preGeneratePopularCache() {
  for (const query of POPULAR_QUERIES) {
    const cached = await checkCache(query);
    if (!cached || isExpiringSoon(cached)) {
      const response = await processQuery(query);
      await cacheResponse(query, response, TTL_POPULAR);
    }
  }

  // Also regenerate top N by hit_count
  const topByHits = await db.query(`
    SELECT normalized_query FROM query_cache
    ORDER BY hit_count DESC
    LIMIT 50
  `);

  for (const { normalized_query } of topByHits) {
    // ... same logic
  }
}
```

### Token Usage Optimization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TOKEN REDUCTION TECHNIQUES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ 1. COMPACT CANDIDATE DATA                                                   │
│    Instead of sending full business objects, send minimal relevant fields: │
│                                                                             │
│    BEFORE (full object):                                                    │
│    {                                                                        │
│      "id": "...", "listing_external_key": "...", "name": "...",                 │
│      "address": "...", "phone": "...", "website": "...",                   │
│      "lat": "...", "lng": "...", "hours_json": {...},                      │
│      "created_at": "...", "updated_at": "...", ...                         │
│    }                                                                        │
│                                                                             │
│    AFTER (compact):                                                         │
│    {                                                                        │
│      "id": "...", "name": "...", "town": "Seaside",                        │
│      "rating": 4.5, "reviews": 120, "price": 2,                            │
│      "tags": ["kid_friendly", "outdoor_seating"],                          │
│      "summary": "Casual beachside spot..."                                 │
│    }                                                                        │
│                                                                             │
│    Reduction: ~70% fewer tokens per candidate                              │
│                                                                             │
│ 2. MODEL SELECTION                                                          │
│    • Query parsing: gpt-4o-mini ($0.15/1M input)                           │
│    • Synthesis: gpt-4o-mini ($0.15/1M input)                               │
│    • Reserve gpt-4o for complex planning queries only                      │
│                                                                             │
│ 3. STREAMING                                                                │
│    • Stream responses to reduce perceived latency                          │
│    • Does not reduce cost, but improves UX                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cost Projections

| Scenario | Queries/Day | Cache Hit Rate | AI Calls/Day | Monthly Cost |
|----------|-------------|----------------|--------------|--------------|
| MVP Launch | 50 | 30% | 35 | ~$2 |
| Growing | 200 | 50% | 100 | ~$6 |
| Active | 1,000 | 70% | 300 | ~$18 |
| Scale | 5,000 | 80% | 1,000 | ~$60 |

---

## 7. Conversational Query Flow

### Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: USER INPUT                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ User types: "Best kid-friendly lunch near Seaside"                         │
│                                                                             │
│ Frontend:                                                                   │
│ • Debounce input (300ms)                                                   │
│ • Show loading state                                                        │
│ • POST /api/search { query: "..." }                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: QUERY NORMALIZATION                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ const normalized = normalizeQuery(rawQuery);                               │
│ // "best kid-friendly lunch near seaside"                                  │
│                                                                             │
│ const queryHash = hashQuery(normalized);                                   │
│ // "a3f2b1c4..."                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: CACHE CHECK                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ const cached = await db.queryOne(`                                         │
│   SELECT * FROM query_cache                                                │
│   WHERE query_hash = $1 AND expires_at > NOW()                             │
│ `, [queryHash]);                                                           │
│                                                                             │
│ if (cached) {                                                               │
│   // Update hit count async                                                │
│   db.query(`UPDATE query_cache SET hit_count = hit_count + 1...`);        │
│   return cached.response_json;  // FAST PATH: ~50ms                       │
│ }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ (cache miss)
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: AI QUERY PARSING                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ const intent = await openai.chat.completions.create({                      │
│   model: "gpt-4o-mini",                                                    │
│   messages: [                                                               │
│     { role: "system", content: PARSE_PROMPT },                             │
│     { role: "user", content: normalized }                                  │
│   ],                                                                        │
│   response_format: { type: "json_object" }                                 │
│ });                                                                         │
│                                                                             │
│ // Result:                                                                  │
│ {                                                                           │
│   "category": "restaurants",                                               │
│   "location": { "town": "seaside", "radius": "near" },                    │
│   "attributes": ["kid_friendly"],                                          │
│   "subcategory": "lunch",                                                  │
│   "result_count": 5                                                        │
│ }                                                                           │
│                                                                             │
│ Latency: ~300-500ms                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: DATABASE QUERY CONSTRUCTION                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Build SQL from structured intent:                                          │
│                                                                             │
│ SELECT b.*, array_agg(t.slug) as tags                                      │
│ FROM businesses b                                                          │
│ LEFT JOIN business_tags bt ON b.id = bt.business_id                        │
│ LEFT JOIN tags t ON bt.tag_id = t.id                                       │
│ WHERE b.status = 'active'                                                  │
│   AND b.category_id = (SELECT id FROM categories WHERE slug = 'restaurants')│
│   AND b.town_id IN (                                                       │
│     SELECT id FROM towns                                                   │
│     WHERE slug = 'seaside'                                                 │
│     OR earth_distance(ll_to_earth(center_lat, center_lng),                │
│                       ll_to_earth(30.321, -86.135)) < 8000                 │
│   )                                                                         │
│   AND EXISTS (                                                              │
│     SELECT 1 FROM business_tags bt2                                        │
│     JOIN tags t2 ON bt2.tag_id = t2.id                                     │
│     WHERE bt2.business_id = b.id AND t2.slug = 'kid_friendly'              │
│   )                                                                         │
│ GROUP BY b.id                                                              │
│                                                                             │
│ Ranking (required — Section 11): apply hard eligibility, then composite     │
│ score (precomputed components + query-time relevance). Do not send        │
│ candidates ranked only by listing_rating / review_count to the AI layer.     │
│ ORDER BY final_composite_score DESC LIMIT 15;                               │
│                                                                             │
│ Latency: ~20-80ms depending on score joins/materialization                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: CANDIDATE PREPARATION                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Transform DB results to compact format for AI:                             │
│                                                                             │
│ const candidates = dbResults.map(b => ({                                   │
│   id: b.id,                                                                 │
│   name: b.name,                                                             │
│   town: b.town_name,                                                        │
│   rating: b.listing_rating,                                                  │
│   reviews: b.listing_review_count,                                          │
│   price: b.price_level,                                                     │
│   tags: b.tags,                                                             │
│   summary: b.ai_summary                                                     │
│ }));                                                                        │
│                                                                             │
│ const candidateIds = new Set(candidates.map(c => c.id));                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: AI SYNTHESIS                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ const synthesis = await openai.chat.completions.create({                   │
│   model: "gpt-4o-mini",                                                    │
│   messages: [                                                               │
│     { role: "system", content: SYNTHESIS_PROMPT },                         │
│     { role: "user", content: JSON.stringify({                              │
│       original_query: rawQuery,                                             │
│       intent: parsedIntent,                                                 │
│       candidates: candidates                                                │
│     })}                                                                     │
│   ],                                                                        │
│   response_format: { type: "json_object" }                                 │
│ });                                                                         │
│                                                                             │
│ Latency: ~500-800ms                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: RESPONSE VALIDATION                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ const aiResponse = JSON.parse(synthesis.content);                          │
│ const validation = validateAIResponse(aiResponse, candidateIds);           │
│                                                                             │
│ if (!validation.valid) {                                                    │
│   // Log error, return fallback template response                          │
│   return fallbackResponse(candidates.slice(0, 5));                         │
│ }                                                                           │
│                                                                             │
│ // Enrich with full business data for display                              │
│ const enriched = enrichRecommendations(aiResponse, dbResults);             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 9: CACHE STORAGE                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ await db.query(`                                                           │
│   INSERT INTO query_cache                                                  │
│   (query_hash, normalized_query, raw_queries, response_json,               │
│    business_ids, expires_at)                                               │
│   VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '24 hours')                │
│ `, [queryHash, normalized, [rawQuery], enriched,                           │
│     aiResponse.recommendations.map(r => r.business_id)]);                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 10: RETURN RESPONSE                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ return {                                                                    │
│   query: rawQuery,                                                          │
│   summary: aiResponse.search_summary,                                       │
│   recommendations: enriched.recommendations.map(rec => ({                  │
│     ...rec,                                                                 │
│     business: fullBusinessData[rec.business_id]                            │
│   })),                                                                      │
│   suggestions: aiResponse.suggestions,                                      │
│   cached: false,                                                            │
│   latency_ms: Date.now() - startTime                                       │
│ };                                                                          │
│                                                                             │
│ Total latency (cache miss): 800-1400ms                                     │
│ Total latency (cache hit): 50-100ms                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Edge Cases & Fallbacks

| Scenario | Detection | Fallback |
|----------|-----------|----------|
| No DB results | candidates.length === 0 | "No exact matches found. Try broadening your search." |
| AI parse fails | JSON parse error | Use keyword-based SQL search |
| AI synthesis fails | Validation fails | Template response with top 5 by rating |
| Rate limited | 429 response | Queue request, show "Thinking..." |
| Timeout | >5s total | Return partial results if available |

---

## 8. Admin & Moderation System

### Admin Dashboard Sections

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD LAYOUT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ INGESTION       │  │ BUSINESSES      │  │ QUERIES         │             │
│  │                 │  │                 │  │                 │             │
│  │ • Trigger jobs  │  │ • List/search   │  │ • Popular list  │             │
│  │ • View queue    │  │ • Edit details  │  │ • Cache stats   │             │
│  │ • Job history   │  │ • Manage tags   │  │ • Pre-generate  │             │
│  │ • Error logs    │  │ • Duplicates    │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ FRESHNESS       │  │ TAGS            │  │ ANALYTICS       │             │
│  │                 │  │                 │  │                 │             │
│  │ • Stale items   │  │ • Manage tags   │  │ • Query volume  │             │
│  │ • Refresh queue │  │ • Categories    │  │ • Cache hits    │             │
│  │ • Data quality  │  │ • Bulk assign   │  │ • Top searches  │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Admin Features

#### 1. Ingestion Trigger UI

```typescript
// /admin/ingestion page
interface IngestionTriggerForm {
  category: CategorySelect;      // Dropdown of categories
  town: TownSelect;              // Dropdown of towns, or "All"
  priority: PrioritySelect;      // 1-10
  runImmediately: boolean;       // Queue vs immediate
}

// Creates search_jobs records
// If runImmediately: calls /api/cron/discovery directly
```

#### 2. Duplicate Resolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DUPLICATE DETECTION                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Detection query:                                                            │
│ SELECT a.id, a.name, b.id, b.name,                                         │
│   similarity(a.name, b.name) as name_sim,                                  │
│   earth_distance(ll_to_earth(a.lat, a.lng),                                │
│                  ll_to_earth(b.lat, b.lng)) as distance_m                  │
│ FROM businesses a                                                          │
│ JOIN businesses b ON a.id < b.id                                           │
│ WHERE similarity(a.name, b.name) > 0.7                                     │
│   AND earth_distance(...) < 100  -- within 100 meters                      │
│   AND a.status = 'active' AND b.status = 'active';                         │
│                                                                             │
│ Resolution UI:                                                              │
│ • Side-by-side comparison                                                  │
│ • "Merge" → combines data, keeps better record, soft-deletes other        │
│ • "Keep both" → marks as reviewed, not duplicate                           │
│ • "Hide one" → sets status='hidden'                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3. Business Editing

```typescript
// Business edit form fields
interface BusinessEditForm {
  // Core (editable)
  name: string;
  town_id: number;
  category_id: number;
  status: 'active' | 'hidden' | 'closed' | 'flagged';

  // Listing metrics (read-only, display where allowed)
  listing_rating: number;
  listing_review_count: number;

  // Tags (multi-select)
  tags: TagId[];

  // AI content (regenerate button)
  ai_summary: string;

  // Admin notes
  admin_notes: string;

  // Actions
  refresh_now: button;      // Queue directory refresh (cron)
  regenerate_summary: button;
  invalidate_cache: button; // Clear all cache entries with this business
}
```

#### 4. Freshness Monitoring

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRESHNESS DASHBOARD                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ METRICS:                                                                    │
│ ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│ │ Stale (>30d)  │  │ Due Soon      │  │ Fresh         │  │ Never Ref.    │ │
│ │     42        │  │     18        │  │    156        │  │      3        │ │
│ └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘ │
│                                                                             │
│ STALE BUSINESSES (need refresh):                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Name              │ Town      │ Last Refresh │ Priority │ Action        │ │
│ ├───────────────────┼───────────┼──────────────┼──────────┼───────────────┤ │
│ │ Bud & Alley's     │ Seaside   │ 45 days ago  │ High     │ [Refresh Now] │ │
│ │ Amavida Coffee    │ Rosemary  │ 38 days ago  │ Medium   │ [Refresh Now] │ │
│ │ ...               │ ...       │ ...          │ ...      │ ...           │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ BULK ACTIONS:                                                               │
│ [Refresh All Stale] [Queue High Priority] [Export Report]                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Admin Authentication

- Uses Supabase Auth
- Role-based: `admin` role required
- Row Level Security (RLS) policies:

```sql
-- Only admins can access admin tables
CREATE POLICY admin_only ON search_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Only admins can modify businesses
CREATE POLICY admin_write ON businesses
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Public can read active businesses
CREATE POLICY public_read ON businesses
  FOR SELECT USING (status = 'active');
```

---

## 9. Scalability Considerations

### Current Design Capacity

| Component | MVP Capacity | Scaling Trigger | Scale Path |
|-----------|--------------|-----------------|------------|
| Database | 5,000 businesses | >10K | Supabase Pro plan |
| Cache hits | 1,000/day | >5K/day | Add Redis/Upstash |
| AI calls | 500/day | >2K/day | Batch optimization |
| Cron jobs | 30 jobs/night | >100/night | Parallel workers |

### Database Scaling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATABASE OPTIMIZATION PATH                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ PHASE 1 (MVP):                                                              │
│ • Supabase Free/Pro tier                                                   │
│ • Standard indexing as defined                                             │
│ • Connection pooling via Supabase                                          │
│                                                                             │
│ PHASE 2 (1K+ daily users):                                                 │
│ • Add read replica for search queries                                      │
│ • Implement query result pagination                                        │
│ • Add database-level query caching (pg_stat_statements)                   │
│                                                                             │
│ PHASE 3 (10K+ daily users):                                                │
│ • Dedicated Postgres instance                                              │
│ • Partitioning by town_id if needed                                        │
│ • Consider PostGIS for advanced geo queries                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Caching Scaling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CACHE EVOLUTION PATH                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ PHASE 1 (MVP):                                                              │
│ • query_cache table in Postgres                                            │
│ • Simple hash-based lookup                                                 │
│ • TTL managed via expires_at column                                        │
│                                                                             │
│ PHASE 2 (High traffic):                                                    │
│ • Add Upstash Redis for hot cache layer                                    │
│ • Postgres becomes cold storage / backup                                   │
│ • Redis TTL for automatic expiration                                       │
│                                                                             │
│ PHASE 3 (Regional):                                                        │
│ • Edge caching via Vercel Edge Config                                      │
│ • Pre-deploy popular queries to edge                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Rate Limiting

```typescript
// Implement at API route level
const rateLimiter = {
  // Per-IP limits
  search: {
    window: '1m',
    max: 20  // 20 searches per minute per IP
  },

  // Authenticated user limits
  authenticated: {
    window: '1m',
    max: 60
  },

  // Global limits (protect OpenAI costs)
  global: {
    window: '1h',
    max: 5000  // Max 5K AI calls per hour across all users
  }
};

// Implementation via Vercel KV or Upstash
```

### Cost Scaling Analysis

| Monthly Users | Est. AI Calls | OpenAI Cost | Supabase | Vercel | Total |
|---------------|---------------|-------------|----------|--------|-------|
| 500 | 1,500 | $2 | $0 | $0 | ~$2 |
| 2,000 | 5,000 | $6 | $25 | $0 | ~$31 |
| 10,000 | 15,000 | $18 | $25 | $20 | ~$63 |
| 50,000 | 50,000 | $60 | $75 | $150 | ~$285 |

---

## 10. MVP Scope vs Future Enhancements

### MVP (Phase 1) — Target: 6–8 Weeks (PRD-aligned)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MVP FEATURE SET (matches PRD Phase 1)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ CORE SEARCH                                                                 │
│ ✓ Natural language search input                                           │
│ ✓ AI query parsing → structured DB query                                  │
│ ✓ 3-5 recommendations with explanations                                   │
│ ✓ Business cards with name, rating, tags, summary                         │
│ ✓ Query response caching                                                   │
│                                                                             │
│ AUTH & SAVES (PRD)                                                          │
│ ✓ Supabase Auth — magic link for end users                                │
│ ✓ Save businesses; simple saved list                                       │
│ ✓ RLS on user-scoped tables (`user_saves`, suppressions)                  │
│                                                                             │
│ SHARE (PRD — growth)                                                        │
│ ✓ Shareable URL per search result set (`shares` → `query_cache`)          │
│ ✓ Public share page loads cached JSON (recipient experience)               │
│                                                                             │
│ DATA                                                                        │
│ ✓ Initial seed: 10 towns × 5 categories = 50 discovery jobs              │
│ ✓ ~200-300 initial businesses                                             │
│ ✓ Core tags: cuisine, vibe, audience (20-30 tags)                         │
│ ✓ AI-generated summaries for all businesses                               │
│                                                                             │
│ ADMIN (PRD)                                                                 │
│ ✓ Basic business list/edit                                                │
│ ✓ Manual ingestion trigger                                                │
│ ✓ Job status view                                                          │
│ ✓ Review / merge duplicates (basic workflow — Section 8)                  │
│ ✓ Supabase auth for admin (role-gated routes)                             │
│                                                                             │
│ INFRASTRUCTURE                                                              │
│ ✓ Nightly discovery cron                                                   │
│ ✓ Basic error logging                                                      │
│                                                                             │
│ SCORING & FEEDBACK                                                          │
│ ✓ Weighted scoring algorithm                                               │
│ ✓ Eligibility filtering                                                    │
│ ✓ Private feedback (+ session suppressions; authenticated suppressions OK) │
│ ✓ Impression/interaction tracking (incl. save, share, click)               │
│ ✓ Nightly score computation                                                │
│                                                                             │
│ NOT IN MVP (PRD “future” or Phase 2 product)                                │
│ ✗ Rich social preview cards / custom OG images                            │
│ ✗ Collections, business claims, sponsorships (PRD Phase 2–3)              │
│ ✗ Advanced analytics dashboards / data-quality score UI                    │
│ ✗ Multi-turn itinerary / personalization at scale (Phase 3)               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2 — Target: After MVP (PRD product Phase 2 + engineering depth)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ PRODUCT (PRD Phase 2)                                                       │
│ • AI ranking / relevance tuning iterations                                 │
│ • Collections (saved groupings beyond flat list)                          │
│ • Business claims workflow                                                  │
│                                                                             │
│ SHARING POLISH                                                              │
│ • Open Graph meta tags and richer previews                                 │
│ • Deeper share analytics                                                   │
│                                                                             │
│ ADMIN & DATA QUALITY                                                        │
│ • Bulk tag management                                                       │
│ • Cache management (view, invalidate, warm popular keys)                   │
│ • Stronger duplicate automation (batch scans, confidence scores)           │
│ • Automated refresh scheduling, freshness dashboards                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3 — Target: Ongoing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: SCALE & POLISH                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ENHANCED AI                                                                 │
│ • Multi-turn conversation (follow-up questions)                            │
│ • "Plan my day" itinerary builder                                          │
│ • Personalization based on past queries/saves                              │
│                                                                             │
│ SOCIAL                                                                      │
│ • Rich social preview cards (image, description)                           │
│ • User reviews/tips (moderated)                                            │
│ • "Recommended by" badges                                                  │
│                                                                             │
│ PERFORMANCE                                                                 │
│ • Redis cache layer                                                         │
│ • Edge caching for popular queries                                         │
│ • Response streaming                                                        │
│                                                                             │
│ MONETIZATION OPTIONS                                                        │
│ • Featured listings (paid placement)                                       │
│ • Business dashboard (claim & manage)                                      │
│ • Premium user features                                                     │
│                                                                             │
│ EXPANSION                                                                   │
│ • Additional Florida beach towns                                           │
│ • Category expansion (services, rentals)                                   │
│ • Event/seasonal content                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Engineering Ticket Breakdown (MVP)

| Epic | Ticket | Est. Points |
|------|--------|-------------|
| **Data Model** | Set up Supabase project & schema | 3 |
| | Seed towns, categories, tags | 2 |
| | Create RLS policies | 2 |
| | Create scoring & engagement tables | 3 |
| **Ingestion** | directory API integration | 5 |
| | Discovery job processor | 5 |
| | AI summary generation | 3 |
| | Nightly cron setup (Vercel) | 2 |
| **Scoring** | Implement eligibility filter | 3 |
| | Implement relevance scoring | 5 |
| | Implement confidence scoring | 3 |
| | Implement engagement scoring with smoothing | 5 |
| | Implement freshness scoring | 2 |
| | Implement diversity re-ranking | 3 |
| | Nightly score computation job | 3 |
| **Search API** | Query normalization & caching | 3 |
| | AI query parsing endpoint | 3 |
| | DB query builder with scoring | 5 |
| | AI synthesis endpoint | 5 |
| | Response validation | 2 |
| **Auth & saves (PRD MVP)** | Magic link for end users; roles (user vs admin) | 3 |
| | `user_saves` API + RLS; save/unsave UI | 3 |
| | Saved list page | 2 |
| **Share (PRD MVP)** | Create `shares` row; `/api/share/[id]` + public page | 5 |
| **Engagement Tracking** | Impression logging | 3 |
| | Interaction tracking (click, save, share) | 3 |
| **Feedback System** | Feedback API endpoint | 3 |
| | Feedback menu component | 2 |
| | Bad experience reason picker | 2 |
| | User suppressions logic (session + authenticated) | 2 |
| | Nightly feedback aggregation | 2 |
| **Frontend** | Search input component | 2 |
| | Results display component | 3 |
| | Business card component | 2 |
| | Loading/error states | 2 |
| | Feedback UI (report issue) | 2 |
| **Admin** | Admin route protection + role checks | 2 |
| | Business list/edit page | 3 |
| | Ingestion trigger UI | 2 |
| | Job status view | 2 |
| | Scoring dashboard | 3 |
| | Duplicate review & merge UI (PRD MVP) | 5 |
| **Testing** | API integration tests | 3 |
| | Scoring algorithm unit tests | 3 |
| | Feedback system tests | 2 |
| | E2E search flow test | 2 |
| | E2E save + share flows | 2 |
| **Total** | | **137 points** |

---

## 11. Scoring Algorithm Specification

This section defines the complete ranking algorithm for selecting and ordering business recommendations. The algorithm uses explicit weighted scoring rather than black-box machine learning, ensuring transparency, debuggability, and controllability.

### Design Principles

1. **Bad businesses are filtered out** — Hard eligibility rules remove untrustworthy candidates before scoring
2. **Relevance matters most** — The strongest signal is how well a business matches the query
3. **Popularity doesn't overpower quality** — Engagement uses rates, not raw counts, with smoothing
4. **New businesses have a chance** — Exploration score gives new/underexposed businesses fair visibility
5. **AI only sees strong candidates** — Only the top 10-15 scored businesses are sent to AI

---

### 11.1 Hard Eligibility Filter

Before scoring, businesses must pass hard eligibility checks. Excluded businesses are **never** sent to AI.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HARD ELIGIBILITY RULES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ EXCLUDE IF ANY OF THESE ARE TRUE:                                          │
│                                                                             │
│ • status != 'active'                                                        │
│ • suspected_closed = true                                                   │
│ • admin_suppressed = true                                                   │
│ • confidence_score < 0.35                                                   │
│ • freshness_score < 0.20                                                    │
│ • user has personal suppression (hide_for_me or had_bad_experience)        │
│ • bad_experience_unique_users >= 3 AND confidence_score < 0.50             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**SQL Implementation:**
```sql
-- Base eligibility filter (applied before scoring)
SELECT b.*
FROM businesses b
WHERE b.status = 'active'
  AND b.suspected_closed = FALSE
  AND b.admin_suppressed = FALSE
  AND b.confidence_score >= 0.35
  AND b.freshness_score >= 0.20
  AND NOT (b.bad_experience_unique_users >= 3 AND b.confidence_score < 0.50)
  AND NOT EXISTS (
    SELECT 1 FROM user_suppressions us
    WHERE us.business_id = b.id
    AND us.user_id = $current_user_id
  );
```

---

### 11.2 Main Ranking Formula

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FINAL SCORE FORMULA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  final_score =                                                              │
│      0.40 × relevance_score                                                 │
│    + 0.25 × confidence_score                                                │
│    + 0.20 × engagement_score                                                │
│    + 0.10 × freshness_score                                                 │
│    + 0.05 × exploration_score                                               │
│                                                                             │
│  All component scores normalized to 0.0–1.0 (except exploration: -0.1–+0.1)│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Weight Rationale:**

| Component | Weight | Rationale |
|-----------|--------|-----------|
| Relevance | 40% | Most important — user wants results that match their query |
| Confidence | 25% | Trustworthiness is critical — don't recommend unreliable data |
| Engagement | 20% | Social proof matters but shouldn't dominate |
| Freshness | 10% | Recent data preferred but not critical for most queries |
| Exploration | 5% | Small nudge for discovery; shouldn't overwhelm quality |

---

### 11.3 Relevance Score

The relevance score measures how well a business matches the user's query intent.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RELEVANCE SCORE FORMULA                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  relevance_score =                                                          │
│      0.30 × category_match                                                  │
│    + 0.15 × subcategory_match                                               │
│    + 0.20 × geo_match                                                       │
│    + 0.20 × tag_match                                                       │
│    + 0.15 × use_case_match                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Definitions

**Category Match:**
```
exact match    → 1.0
parent match   → 0.5  (e.g., query="food", business=restaurant)
no match       → 0.0
```

**Subcategory Match:**
```
exact match    → 1.0
no match       → 0.0
```

**Geo Match:**
```
same_town           → 1.0
adjacent_town       → 0.8
within 5 miles      → 0.7
within 10 miles     → 0.5
beyond 10 miles     → 0.2
```

**Tag Match (Jaccard-like):**
```
tag_match = matched_tags / total_query_tags
```
Example: Query has tags [kid_friendly, outdoor_seating], business has [kid_friendly]
→ tag_match = 1/2 = 0.5

**Use Case Match:**
```
use_case_match = overlap(query_intent, business.best_for) / query_intent_count
```
Example: Query intent is "family lunch", business.best_for = ["family lunch", "casual dinner"]
→ use_case_match = 1.0

---

### 11.4 Confidence Score

The confidence score determines if a business is trustworthy enough to recommend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONFIDENCE SCORE FORMULA                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  confidence_score =                                                         │
│      0.20 × completeness_score                                              │
│    + 0.15 × source_quality_score                                            │
│    + 0.15 × freshness_integrity_score                                       │
│    + 0.15 × consistency_score                                               │
│    + 0.15 × positive_trust_score                                            │
│    + 0.20 × negative_feedback_adjustment                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Component Definitions

**Completeness Score:**
```typescript
function computeCompleteness(business: Business): number {
  const fields = [
    business.name,           // required
    business.category_id,    // required
    business.address,
    business.town_id,
    business.website,
    business.phone,
    business.ai_summary,
    business.listing_rating,
    (business.tags?.length > 0),
    (business.best_for?.length > 0),
  ];
  const filled = fields.filter(Boolean).length;
  return filled / fields.length;
}
```

**Source Quality Score:**
- Directory listing verified: 1.0
- Admin-verified: 1.0
- User-submitted (unverified): 0.5
- Scraped (unconfirmed): 0.3

**Freshness Integrity Score:**
```
freshness_integrity = max(0, 1 - (days_since_refresh / expected_refresh_interval))
```

**Consistency Score:**
- No duplicate conflicts: 1.0
- Minor data mismatches: 0.7
- Significant conflicts: 0.3

**Positive Trust Score:**
```typescript
function computePositiveTrust(business: Business): number {
  let score = 0.5;  // base
  if (business.total_saves > 10) score += 0.2;
  if (business.listing_rating >= 4.0) score += 0.15;
  if (business.listing_review_count >= 50) score += 0.15;
  // Future: claimed business status
  return Math.min(1.0, score);
}
```

**Negative Feedback Adjustment:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEGATIVE FEEDBACK ADJUSTMENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  negative_feedback_adjustment = max(0, 1.0 - weighted_penalty)              │
│                                                                             │
│  Penalty weights (per unique user):                                         │
│  • had_bad_experience  → 0.20 penalty each                                 │
│  • inaccurate_info     → 0.10 penalty each                                 │
│  • not_relevant        → 0.05 penalty each                                 │
│                                                                             │
│  Cap total penalty at 0.70 (minimum adjustment = 0.30)                     │
│                                                                             │
│  Example:                                                                   │
│  2 bad_experience + 1 inaccurate_info                                      │
│  penalty = 0.20 + 0.20 + 0.10 = 0.50                                       │
│  negative_feedback_adjustment = 0.50                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11.5 Engagement Score

Uses **smoothed rates** instead of raw counts to prevent gaming and handle low-volume businesses fairly.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ENGAGEMENT SCORE FORMULA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  engagement_score =                                                         │
│      0.45 × save_rate_score                                                 │
│    + 0.20 × ctr_score                                                       │
│    + 0.15 × share_rate_score                                                │
│    + 0.20 × repeat_engagement_score                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Bayesian Smoothing

To prevent unstable scores for businesses with few impressions:

```
smoothed_rate = (observed_events + prior_weight × prior_rate) / (impressions + prior_weight)
```

**Default Parameters:**
- `prior_rate = 0.05` (5% baseline)
- `prior_weight = 20` (effective 20 "virtual" impressions)

**Example:**
```
Business A: 1 save from 1 impression
Raw rate = 1.0 (100%)
Smoothed = (1 + 20 × 0.05) / (1 + 20) = 2.0 / 21 = 0.095 (9.5%)

Business B: 50 saves from 1000 impressions
Raw rate = 0.05 (5%)
Smoothed = (50 + 20 × 0.05) / (1000 + 20) = 51 / 1020 = 0.05 (5%)
```

This prevents a single lucky save from making a business look artificially amazing.

#### Rate Calculations

```typescript
function computeEngagementScore(business: Business): number {
  const priorRate = 0.05;
  const priorWeight = 20;

  const smoothedSaveRate = smooth(business.total_saves, business.total_impressions, priorRate, priorWeight);
  const smoothedCTR = smooth(business.total_clicks, business.total_impressions, priorRate, priorWeight);
  const smoothedShareRate = smooth(business.total_shares, business.total_impressions, priorRate * 0.2, priorWeight);

  // Normalize rates to 0-1 scores (divide by expected max rates)
  const saveScore = Math.min(1, smoothedSaveRate / 0.15);    // 15% save rate = max
  const ctrScore = Math.min(1, smoothedCTR / 0.30);          // 30% CTR = max
  const shareScore = Math.min(1, smoothedShareRate / 0.05);  // 5% share rate = max

  // Repeat engagement: unique users with multiple interactions
  const repeatScore = computeRepeatEngagement(business.id);

  return 0.45 * saveScore + 0.20 * ctrScore + 0.15 * shareScore + 0.20 * repeatScore;
}

function smooth(events: number, impressions: number, priorRate: number, priorWeight: number): number {
  return (events + priorWeight * priorRate) / (impressions + priorWeight);
}
```

---

### 11.6 Freshness Score

Measures how current the business data is, relative to category-specific refresh cadence.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FRESHNESS SCORE FORMULA                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  freshness_score = max(0, 1 - (days_since_refresh / refresh_window_days))  │
│                                                                             │
│  Refresh windows by category:                                               │
│  • restaurants, cafes     → 60 days                                        │
│  • activities             → 90 days                                        │
│  • photographers          → 120 days                                       │
│  • cleaners, home services → 180 days                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Examples:**
```
Restaurant refreshed 15 days ago:
freshness_score = 1 - (15 / 60) = 0.75

Restaurant refreshed 70 days ago:
freshness_score = 1 - (70 / 60) = -0.17 → clamped to 0
```

**SQL Implementation:**
```sql
UPDATE businesses b
SET freshness_score = GREATEST(0,
  1.0 - (
    EXTRACT(EPOCH FROM (NOW() - b.last_refreshed_at)) / 86400.0
  ) / c.refresh_interval_days
)
FROM categories c
WHERE b.category_id = c.id;
```

---

### 11.7 Exploration Score

Gives new or underexposed businesses a fair chance while penalizing overexposed businesses with weak engagement.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXPLORATION SCORE FORMULA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  exploration_score =                                                        │
│      new_business_boost                                                     │
│    + underexposed_boost                                                     │
│    - overexposure_penalty                                                   │
│                                                                             │
│  Clamped to range: -0.10 to +0.10                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Rules:**

| Condition | Adjustment |
|-----------|------------|
| New business (< 30 days) AND confidence > 0.55 | +0.05 |
| Low impressions (< 50) AND completeness > 0.7 | +0.03 |
| High impressions (> 500) AND engagement < 0.3 | -0.05 |

```typescript
function computeExplorationScore(business: Business): number {
  let score = 0;

  const daysSinceCreated = daysBetween(business.created_at, now());

  // New business boost
  if (daysSinceCreated < 30 && business.confidence_score > 0.55) {
    score += 0.05;
  }

  // Underexposed boost
  if (business.total_impressions < 50 && business.completeness_score > 0.7) {
    score += 0.03;
  }

  // Overexposure penalty
  if (business.total_impressions > 500 && business.engagement_score < 0.3) {
    score -= 0.05;
  }

  return Math.max(-0.10, Math.min(0.10, score));
}
```

---

### 11.8 Context-Aware Negative Feedback

Not all negative feedback affects all queries equally. Feedback should have stronger impact when the query context matches the feedback context.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONTEXT-AWARE PENALTY WEIGHTING                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  context_penalty = base_penalty × context_similarity                        │
│                                                                             │
│  Context similarity:                                                        │
│  • same intent (e.g., "not kid-friendly" + family query)  → 1.0            │
│  • related intent (same category, different use case)     → 0.5            │
│  • unrelated intent                                        → 0.0            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example:**
User reported "Not kid-friendly" for a restaurant.

| Query | Context Similarity | Penalty Applied |
|-------|-------------------|-----------------|
| "kid-friendly restaurants" | 1.0 | Full penalty |
| "family brunch" | 1.0 | Full penalty |
| "romantic dinner" | 0.0 | No penalty |
| "lunch near seaside" | 0.5 | Half penalty |

```typescript
function computeContextAwarePenalty(
  feedback: UserFeedback[],
  queryIntent: ParsedIntent
): number {
  let totalPenalty = 0;

  for (const fb of feedback) {
    const basePenalty = PENALTY_WEIGHTS[fb.feedback_type];
    const similarity = computeIntentSimilarity(fb.intent_context, queryIntent);
    totalPenalty += basePenalty * similarity;
  }

  return Math.min(0.70, totalPenalty);  // cap at 70%
}
```

---

### 11.9 Diversity Re-Ranking

After computing `final_score`, apply a diversity pass to avoid repetitive results.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DIVERSITY RE-RANKING RULES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Applied to top 15 candidates after scoring:                               │
│                                                                             │
│  • Max 2 businesses from same micro-area in top 5                          │
│  • Max 2 businesses with nearly identical tag profiles in top 5            │
│  • Demote same-chain/brand duplicates for broad queries                    │
│                                                                             │
│  Diversity penalties:                                                       │
│  • Same area (within 0.5 miles)      → 0.03 penalty per duplicate         │
│  • Same tag cluster (>80% overlap)   → 0.03 penalty per duplicate         │
│  • Same brand/chain                  → 0.05 penalty per duplicate         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
function diversifyResults(
  candidates: ScoredBusiness[],
  query: ParsedIntent
): ScoredBusiness[] {
  const selected: ScoredBusiness[] = [];
  const remaining = [...candidates];

  while (selected.length < 15 && remaining.length > 0) {
    // Take highest scored remaining
    remaining.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const next = remaining.shift()!;
    selected.push(next);

    // Apply penalties to similar remaining businesses
    for (const candidate of remaining) {
      if (isSameArea(next.business, candidate.business)) {
        candidate.adjustedScore -= 0.03;
      }
      if (hasSimilarTags(next.business, candidate.business, 0.8)) {
        candidate.adjustedScore -= 0.03;
      }
      if (isSameBrand(next.business, candidate.business)) {
        candidate.adjustedScore -= 0.05;
      }
    }
  }

  return selected;
}
```

---

### 11.10 Candidate Selection for AI

Only the final top 10-15 ranked businesses are sent to AI for synthesis.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AI CANDIDATE SELECTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Apply hard eligibility filter                                          │
│  2. Compute relevance_score for each eligible business                     │
│  3. Compute final_score using precomputed confidence/engagement/freshness  │
│  4. Sort by final_score descending                                         │
│  5. Apply diversity re-ranking                                             │
│  6. Take top 10-15 candidates                                              │
│  7. Pass to AI for final selection (3-5) and explanation generation        │
│                                                                             │
│  AI NEVER sees:                                                             │
│  • Ineligible businesses                                                   │
│  • Suppressed businesses                                                   │
│  • Businesses below rank 15                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11.11 Complete Pseudocode

```python
def rank_businesses(user, query, businesses):
    """
    Complete ranking pipeline for recommendation scoring.
    """
    eligible = []

    # Step 1: Hard eligibility filter
    for b in businesses:
        if not b.is_active:
            continue
        if b.suspected_closed:
            continue
        if b.admin_suppressed:
            continue
        if b.confidence_score < 0.35:
            continue
        if b.freshness_score < 0.20:
            continue
        if user_has_suppression(user, b.id):
            continue
        if b.bad_experience_unique_users >= 3 and b.confidence_score < 0.50:
            continue

        eligible.append(b)

    # Step 2: Compute scores
    scored = []
    for b in eligible:
        # Relevance computed at query time
        relevance = compute_relevance_score(query, b)

        # These are precomputed nightly
        confidence = b.confidence_score
        engagement = b.engagement_score
        freshness = b.freshness_score
        exploration = b.exploration_score

        # Apply context-aware negative feedback adjustment
        feedback = get_user_feedback(b.id)
        context_penalty = compute_context_penalty(feedback, query.intent)
        adjusted_confidence = confidence * (1 - context_penalty)

        final_score = (
            0.40 * relevance +
            0.25 * adjusted_confidence +
            0.20 * engagement +
            0.10 * freshness +
            0.05 * exploration
        )

        scored.append({
            "business": b,
            "final_score": final_score,
            "adjusted_score": final_score,  # for diversity adjustment
            "relevance": relevance,
            "confidence": adjusted_confidence,
            "engagement": engagement,
            "freshness": freshness,
            "exploration": exploration,
        })

    # Step 3: Sort by score
    scored.sort(key=lambda x: x["final_score"], reverse=True)

    # Step 4: Diversity re-ranking
    diversified = diversify_results(scored, query)

    # Step 5: Return top 15 for AI
    return diversified[:15]


def compute_relevance_score(query, business):
    """Compute query-time relevance score."""
    category_match = 1.0 if query.category == business.category else (
        0.5 if is_parent_category(query.category, business.category) else 0.0
    )

    subcategory_match = 1.0 if query.subcategory == business.subcategory else 0.0

    geo_match = compute_geo_match(query.location, business)

    tag_match = len(set(query.tags) & set(business.tags)) / max(1, len(query.tags))

    use_case_match = len(set(query.use_cases) & set(business.best_for)) / max(1, len(query.use_cases))

    return (
        0.30 * category_match +
        0.15 * subcategory_match +
        0.20 * geo_match +
        0.20 * tag_match +
        0.15 * use_case_match
    )


def compute_geo_match(query_location, business):
    """Compute geographic relevance."""
    if query_location.town == business.town:
        return 1.0

    distance_miles = haversine_distance(query_location, business)

    if is_adjacent_town(query_location.town, business.town):
        return 0.8
    elif distance_miles <= 5:
        return 0.7
    elif distance_miles <= 10:
        return 0.5
    else:
        return 0.2
```

---

### 11.12 Recommended Thresholds

#### Eligibility Thresholds

| Threshold | Value | Action |
|-----------|-------|--------|
| `confidence_score` | < 0.35 | Exclude from results |
| `freshness_score` | < 0.20 | Exclude from results |
| `bad_experience_unique_users` | >= 3 with weak confidence | Exclude from results |
| Bad experience reports in 90 days | >= 2 unique users | Heavy demotion |
| Bad experience reports | 1 | Moderate confidence reduction |

#### New Business Rules

| Rule | Criteria |
|------|----------|
| Exploration eligibility | First 30 days AND confidence > 0.55 |
| Exposure cap | Don't appear in more than 20% of relevant queries |

#### Score Normalization

| Score | Min | Max | Notes |
|-------|-----|-----|-------|
| relevance_score | 0.0 | 1.0 | Computed per query |
| confidence_score | 0.0 | 1.0 | Precomputed nightly |
| engagement_score | 0.0 | 1.0 | Precomputed nightly |
| freshness_score | 0.0 | 1.0 | Precomputed nightly |
| exploration_score | -0.1 | +0.1 | Precomputed nightly |
| final_score | 0.0 | ~1.0 | Weighted sum |

---

### 11.13 Required Signal Logging

The scoring algorithm requires these signals to be logged:

#### Per Impression

| Field | Type | Purpose |
|-------|------|---------|
| business_id | UUID | Which business was shown |
| query_hash | string | Which query showed it |
| rank_position | int | Position in results (1-15) |
| user_id/session_id | string | Track unique users |
| timestamp | datetime | For time-based analysis |

#### Per Interaction

| Field | Type | Purpose |
|-------|------|---------|
| business_id | UUID | Which business |
| interaction_type | enum | click, save, unsave, share |
| user_id/session_id | string | Track unique users |
| query_hash | string | Context of interaction |
| timestamp | datetime | For rate calculations |

#### Per Feedback

| Field | Type | Purpose |
|-------|------|---------|
| business_id | UUID | Which business |
| feedback_type | enum | had_bad_experience, inaccurate_info, not_relevant, hide_for_me |
| user_id | UUID | Who reported (for uniqueness) |
| query_context | string | What query triggered feedback |
| intent_context | JSON | Parsed intent for context weighting |

**Without impression logging, engagement rates cannot be computed.**

---

### 11.14 Computation Strategy

#### Nightly Precomputation (Cron Job)

Compute and store in `businesses` table:
- `confidence_score`
- `freshness_score`
- `engagement_score`
- `exploration_score`
- `completeness_score`
- Aggregate engagement stats
- Negative feedback counts

```sql
-- Example nightly score update
UPDATE businesses b
SET
  confidence_score = compute_confidence(b.id),
  freshness_score = compute_freshness(b.id),
  engagement_score = compute_engagement(b.id),
  exploration_score = compute_exploration(b.id),
  completeness_score = compute_completeness(b.id),
  total_impressions = (SELECT COUNT(*) FROM impressions WHERE business_id = b.id),
  total_clicks = (SELECT COUNT(*) FROM interactions WHERE business_id = b.id AND interaction_type = 'click'),
  total_saves = (SELECT COUNT(*) FROM interactions WHERE business_id = b.id AND interaction_type = 'save'),
  total_shares = (SELECT COUNT(*) FROM interactions WHERE business_id = b.id AND interaction_type = 'share'),
  bad_experience_unique_users = (
    SELECT COUNT(DISTINCT user_id) FROM user_feedback
    WHERE business_id = b.id AND feedback_type = 'had_bad_experience'
  ),
  updated_at = NOW();
```

#### Query-Time Computation

Compute per request:
- `relevance_score` (depends on query)
- Context-aware penalties (depends on query intent)
- Personal suppressions (depends on user)
- `final_score` (weighted sum)
- Diversity adjustments

This approach gives:
- **Fast runtime** — Most scores are precomputed
- **Controllable scoring** — Weights can be tuned without recomputing
- **Easy debugging** — All component scores visible in database

---

### 11.15 Scoring Dashboard (Admin)

The admin dashboard should expose:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCORING DASHBOARD                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OVERVIEW METRICS:                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Avg Conf.    │  │ Low Conf.    │  │ Stale        │  │ Flagged      │   │
│  │ 0.72         │  │ 23 (<0.50)   │  │ 45 (<0.20)   │  │ 7            │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  SCORE DISTRIBUTION:                                                        │
│  confidence:  ████████████░░░░  0.72 avg                                   │
│  freshness:   ██████████████░░  0.85 avg                                   │
│  engagement:  ██████░░░░░░░░░░  0.35 avg                                   │
│                                                                             │
│  BUSINESS SCORE INSPECTOR:                                                  │
│  [Search: ________________]                                                │
│                                                                             │
│  │ Business        │ Final │ Rel  │ Conf │ Eng  │ Fresh │ Expl  │         │
│  ├─────────────────┼───────┼──────┼──────┼──────┼───────┼───────┤         │
│  │ Bud & Alley's   │ 0.78  │ 0.85 │ 0.82 │ 0.65 │ 0.90  │ +0.02 │         │
│  │ The Red Bar     │ 0.71  │ 0.80 │ 0.75 │ 0.58 │ 0.75  │ +0.00 │         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Private Feedback System

This system allows users to provide private feedback on businesses. **All feedback is internal only** — it is never displayed publicly on the UI. Feedback signals are used solely to improve ranking quality and personal recommendations.

### Design Principles

1. **Lightweight** — Quick to submit, no long forms
2. **Optional** — Users choose to provide feedback, never required
3. **Non-dramatic** — Neutral language, not emotional or punitive
4. **Private** — Never shown to other users or businesses
5. **Actionable** — Structured data that can improve recommendations

---

### 12.1 Feedback UI Patterns

#### Recommendation Card Actions

When displaying a business recommendation, include these actions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BUSINESS CARD ACTIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🍽  Bud & Alley's                                    [❤️ Save] [⋯] │   │
│  │  ★★★★☆ 4.2 · $$$ · Seaside                                          │   │
│  │  "Waterfront dining with stunning sunset views..."                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  When user taps [⋯] more options:                                         │
│                                                                             │
│  ┌─────────────────────────┐                                               │
│  │  ⋯ More Options         │                                               │
│  ├─────────────────────────┤                                               │
│  │  📍 Get directions      │                                               │
│  │  🔗 Share               │                                               │
│  │  ─────────────────────  │                                               │
│  │  🚫 Not a good fit      │  ← "not_relevant" feedback                   │
│  │  😕 Had a bad experience│  ← "had_bad_experience" feedback             │
│  │  👁️ Don't show again    │  ← "hide_for_me" suppression                 │
│  └─────────────────────────┘                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### "Had a Bad Experience" Flow

When user selects "Had a bad experience", show a quick structured follow-up:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   "HAD A BAD EXPERIENCE" FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  What went wrong? (optional)                                        │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                │   │
│  │  │  😐 Poor service     │  │  👎 Bad quality      │                │   │
│  │  └──────────────────────┘  └──────────────────────┘                │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                │   │
│  │  │  🚫 Closed/wrong info│  │  👥 Too crowded      │                │   │
│  │  └──────────────────────┘  └──────────────────────┘                │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐                                           │   │
│  │  │  📝 Not as described │                                           │   │
│  │  └──────────────────────┘                                           │   │
│  │                                                                      │   │
│  │  [Skip]                                    [Submit]                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  After submission: "Thanks! We'll use this to improve recommendations."   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key UX Notes:**
- Reason selection is optional — user can skip
- No free-text required (though notes field exists for edge cases)
- Fast interaction — single tap + optional reason
- Neutral confirmation message — no drama

---

### 12.2 Feedback Types & Reasons

| Feedback Type | User Action | Structured Reasons | Effect |
|--------------|-------------|-------------------|--------|
| `not_relevant` | "Not a good fit" | none | Mild ranking penalty in similar queries |
| `had_bad_experience` | "Had a bad experience" | poor_service, bad_quality, closed_inaccurate, too_crowded, not_as_described | Strong ranking penalty, personal suppression |
| `hide_for_me` | "Don't show again" | none | Complete personal suppression |
| `inaccurate_info` | (via report flow) | wrong_hours, wrong_address, wrong_phone, closed, other | Flags for admin review |

### Structured Reasons

```typescript
enum BadExperienceReason {
  POOR_SERVICE = 'poor_service',
  BAD_QUALITY = 'bad_quality',
  CLOSED_INACCURATE = 'closed_inaccurate',
  TOO_CROWDED = 'too_crowded',
  NOT_AS_DESCRIBED = 'not_as_described',
  OTHER = 'other'
}

enum InaccurateInfoReason {
  WRONG_HOURS = 'wrong_hours',
  WRONG_ADDRESS = 'wrong_address',
  WRONG_PHONE = 'wrong_phone',
  CLOSED = 'closed',
  OTHER = 'other'
}
```

---

### 12.3 Storage & Privacy

```typescript
// API endpoint: POST /api/feedback
interface FeedbackRequest {
  business_id: string;
  feedback_type: 'not_relevant' | 'had_bad_experience' | 'hide_for_me' | 'inaccurate_info';
  feedback_reason?: string;  // optional structured reason
  notes?: string;            // optional free text (rare)
  query_context?: string;    // what query the user was viewing
}

// Response
interface FeedbackResponse {
  success: boolean;
  message: string;  // "Thanks! We'll use this to improve recommendations."
}
```

**Privacy Guarantees:**

| What | Visibility |
|------|------------|
| Individual feedback | Never shown to any user |
| Feedback reasons | Never shown publicly |
| Business feedback counts | Admin only |
| Aggregated signals | Used for ranking only |

**MVP vs Phase 2 Behavior:**

| Capability | MVP (Session-based) | Phase 2 (Authenticated) |
|------------|---------------------|------------------------|
| Feedback submission | Via session_id | Via user_id |
| "Don't show again" | Per session only | Persistent across devices |
| Uniqueness counting | Per session | Per user (more accurate) |
| Feedback history | Lost on session end | Persistent |

For MVP, session-based feedback still provides valuable aggregate signals. Authenticated users in Phase 2 get persistent personal suppressions.

---

### 12.4 How Feedback Affects Ranking

#### Immediate Effects (Same Session)

| Feedback Type | Immediate Action |
|---------------|------------------|
| `hide_for_me` | Remove from current and future results for this user |
| `had_bad_experience` | Remove from current session, add to personal suppression |
| `not_relevant` | No immediate visual change |

#### Nightly Aggregation Effects

| Signal | Aggregation | Ranking Impact |
|--------|-------------|----------------|
| `bad_experience_unique_users` | Count distinct users | Affects confidence_score via negative_feedback_adjustment |
| `not_relevant` count | Count in same query context | Context-aware penalty in similar queries |
| `inaccurate_info` count | Count distinct users | Flags for admin, may reduce freshness_integrity |

#### Threshold Actions

| Condition | Action |
|-----------|--------|
| 3+ unique `had_bad_experience` AND confidence < 0.50 | Hard exclusion from results |
| 2+ unique `had_bad_experience` in 90 days | Heavy ranking demotion |
| 3+ `inaccurate_info` reports | Queue for admin review + potential refresh |
| 5+ `closed_inaccurate` reasons | Set `suspected_closed = true` |

---

### 12.5 Positive Feedback (Implicit)

Positive signals are captured **implicitly** through user behavior, not explicit feedback:

| Signal | Capture Method | Storage |
|--------|---------------|---------|
| Save | User taps ❤️ Save | `interactions` table, type='save' |
| Click | User taps to view details | `interactions` table, type='click' |
| Share | User shares recommendation | `interactions` table, type='share' |
| Repeat engagement | Same user, multiple sessions | Derived from interactions |

**No explicit "I loved this!" button** — positive signals come from actions.

---

### 12.6 Feedback API Implementation

```typescript
// POST /api/feedback
export async function POST(req: Request) {
  const { business_id, feedback_type, feedback_reason, notes, query_context } = await req.json();
  const user = await getAuthUser(req);
  const session_id = getSessionId(req);

  // Validate
  if (!business_id || !feedback_type) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get current query intent for context-aware scoring
  const intent_context = query_context ? await parseQueryIntent(query_context) : null;

  // Store feedback
  await db.query(`
    INSERT INTO user_feedback (business_id, user_id, session_id, feedback_type, feedback_reason, query_context, intent_context, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (business_id, user_id, feedback_type)
    DO UPDATE SET
      feedback_reason = EXCLUDED.feedback_reason,
      notes = EXCLUDED.notes,
      created_at = NOW()
  `, [business_id, user?.id, session_id, feedback_type, feedback_reason, query_context, intent_context, notes]);

  // For hide_for_me and had_bad_experience, also add to suppressions
  if (['hide_for_me', 'had_bad_experience'].includes(feedback_type) && user?.id) {
    await db.query(`
      INSERT INTO user_suppressions (user_id, business_id, suppression_type)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [user.id, business_id, feedback_type]);
  }

  // For inaccurate_info, queue admin review
  if (feedback_type === 'inaccurate_info') {
    await queueAdminReview(business_id, 'inaccurate_info_report', { reason: feedback_reason, notes });
  }

  return Response.json({
    success: true,
    message: "Thanks! We'll use this to improve recommendations."
  });
}
```

---

### 12.7 Frontend Component

```tsx
// FeedbackMenu.tsx
interface FeedbackMenuProps {
  businessId: string;
  queryContext?: string;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackMenu({ businessId, queryContext, onFeedbackSubmitted }: FeedbackMenuProps) {
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string | null>(null);

  const submitFeedback = async (type: string, reason?: string) => {
    await fetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        business_id: businessId,
        feedback_type: type,
        feedback_reason: reason,
        query_context: queryContext
      })
    });

    toast.success("Thanks! We'll use this to improve recommendations.");
    onFeedbackSubmitted?.();
  };

  const handleBadExperience = () => {
    setFeedbackType('had_bad_experience');
    setShowReasonPicker(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuItem onClick={() => submitFeedback('not_relevant')}>
          🚫 Not a good fit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBadExperience}>
          😕 Had a bad experience
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => submitFeedback('hide_for_me')}>
          👁️ Don't show again
        </DropdownMenuItem>
      </DropdownMenu>

      {showReasonPicker && (
        <ReasonPicker
          reasons={[
            { id: 'poor_service', label: '😐 Poor service' },
            { id: 'bad_quality', label: '👎 Bad quality' },
            { id: 'closed_inaccurate', label: '🚫 Closed/wrong info' },
            { id: 'too_crowded', label: '👥 Too crowded' },
            { id: 'not_as_described', label: '📝 Not as described' },
          ]}
          onSelect={(reason) => submitFeedback(feedbackType!, reason)}
          onSkip={() => submitFeedback(feedbackType!)}
        />
      )}
    </>
  );
}
```

---

## 13. SEO & town discovery (Phase 2)

**Product:** [PRD-SEO-TOWNS.md](./PRD-SEO-TOWNS.md) · **Technical:** [TDD-SEO-TOWNS.md](./TDD-SEO-TOWNS.md) · **UX:** [UX-BRIEF-TOWNS-SEO.md](./UX-BRIEF-TOWNS-SEO.md)

**Goal:** One **recommendation pipeline** (`buildRecommendationSet` + `scoreAndRankCandidates` + location multipliers) backs AI search, precomputed sets, town hubs, SEO pages, and shares. Extend `query_cache` as the recommendation-set store; add `regions`, `towns.region_id`, `town_adjacency`, `businesses.slug`, `seo_pages`.

**Schema:** see migration `supabase/migrations/*_seo_town_architecture.sql`.

**Routes:** `/[townSlug]` (town or region hub), `/[townSlug]/[intentSlug]` (SEO), `/business/[slug]`; reserved slugs in `lib/routes/reserved-slugs.ts`.

**Crons:** `/api/cron/recommendation-precompute`, `/api/cron/seo-publish` (see `vercel.json`).

**Task checklist:** [whereto30a-full-task-list.md](./whereto30a-full-task-list.md) — Phase 2.

---

## Appendix: Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cache storage | Postgres table | Simplicity; avoid extra service for MVP |
| AI model | gpt-4o-mini | Cost efficiency; sufficient quality for parsing/synthesis |
| Spatial queries | PostGIS earth_distance | Built into Supabase; no extra setup |
| Job queue | Database table | Simple; no external queue service needed |
| Auth | Supabase Auth | Integrated with DB; minimal setup |
| Hosting | Vercel | Next.js native; cron support; edge functions |
| Rate limiting | Vercel KV (future) | In-memory for MVP; KV when needed |
| User feedback | Private, internal only | Better data quality; avoids review gaming; legal simplicity |
| Positive signals | Implicit (saves, clicks) | More accurate than explicit ratings; less user friction |
| Scoring algorithm | Explicit weighted formula | Transparent, debuggable, tunable; no ML black box |
| Engagement metrics | Smoothed rates | Prevents gaming via raw counts; fair to new businesses |
| Score computation | Nightly precompute + query-time relevance | Fast queries; controllable; easy debugging |

---

This plan is ready for conversion into engineering tickets. Each section maps to specific implementation work with clear inputs, outputs, and success criteria. MVP scope and phases follow [PRD.md](./PRD.md); Section 10 and the ticket table are kept in sync with that document.
