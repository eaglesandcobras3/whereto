# 30A Platform — Full Task List

Checklist derived from [PRD.md](./PRD.md) (product source of truth) and [30A-IMPLEMENTATION-PLAN.md](./30A-IMPLEMENTATION-PLAN.md) (engineering spec). Use `- [ ]` / `- [x]` in your tracker or import into an issue system.

**Estimates:** Section 10 of the implementation plan totals **137 points** for MVP engineering tickets; tasks below decompose those tickets plus Phase 2/3 and operational work.

**Implementation status (in-repo, 2026-04):** Phase **1** engineering checklist below is treated as **complete** in-repo (apply the newer discovery migration on your Supabase project). **Still operator-owned (§0):** creating cloud projects and production env (Supabase/Vercel/Google/OpenAI). Cross-cutting items like Sentry, backups, legal, and a11y remain ongoing unless marked below.

---

## 0. Prerequisites and project bootstrap

- [ ] Create Supabase project; enable **PostGIS** (required for spatial queries in the plan)
- [ ] Create Vercel project; link repo; configure environment variables (Supabase URL/keys, OpenAI, Google Places)
- [ ] Register Google Cloud project; enable Places API (New); create API key with HTTP restrictions
- [ ] Add OpenAI API key to Vercel env (server-side only)
- [x] Document local `.env.example` for contributors (no secrets committed)
- [x] Configure `vercel.json` cron routes per plan Section 4 (`/api/cron/discovery`, `refresh`, `ai-summaries`, `cache-prune`, `popular-cache`) + `/api/cron/scores`
- [x] Secure cron routes (e.g. `CRON_SECRET` header verification; dev allows no secret for local runs)
- [x] Align Next.js App Router with project `node_modules/next/dist/docs/` (this repo uses Next 16)

---

## Phase 1 — MVP (PRD-aligned, ~6–8 weeks)

### 1.1 Data model and Supabase (~10 pts)

- [x] Apply schema from plan Section 2: `towns`, `categories`, `subcategories` (if used), `tags`, `businesses`, `business_tags`, `search_jobs`, `query_cache`, `user_saves`, `shares`, scoring/engagement tables (`interactions`, feedback/suppressions as specified) — see `supabase/migrations/20260402120000_init.sql`
- [x] Create indexes listed in plan Section 2 (including feedback/suppression indexes)
- [x] Seed towns (10), categories, tags (20–30), initial `search_jobs` (50 combinations) — `supabase/seed.sql`
- [x] Write RLS policies for public read where appropriate; user-scoped write for `user_saves`, suppressions, feedback
- [x] Admin role model: distinguish admin vs end user (JWT claims or `profiles` table + middleware) — `profiles.is_admin` + [`middleware.ts`](../middleware.ts) on `/admin/*`
- [x] Run migrations in CI or documented manual flow — documented in `supabase/README.md` (manual / CLI)

### 1.2 Ingestion pipeline (~15 pts)

- [x] Google Places **Text Search** client (location bias from `towns`) — `lib/ingestion/google-places.ts`
- [x] Google Places **Place Details** client with field mask; rate limiting (~10 QPS)
- [x] Discovery job processor: poll `search_jobs`, claim with `FOR UPDATE SKIP LOCKED`, status transitions — **note:** claim uses status updates (no `SKIP LOCKED` SQL yet)
- [x] Deduplicate by `google_place_id` before insert
- [x] Map Google types → `category_id` / tags; map lat/lng → `town_id`
- [x] Insert businesses + `business_tags` in a transaction — `insert_discovery_business_with_tags` RPC in `supabase/migrations/20260403140000_insert_discovery_business_with_tags.sql`; discovery calls it from [`lib/ingestion/discovery-runner.ts`](../lib/ingestion/discovery-runner.ts)
- [x] Query expansion for category+town (plan Section 3) — [`lib/ingestion/query-expansion.ts`](../lib/ingestion/query-expansion.ts) + admin ingestion checkbox [`app/admin/ingestion/actions.ts`](../app/admin/ingestion/actions.ts)
- [x] Refresh pipeline: select stale businesses by `refresh_interval_days`, update fields, handle `permanently_closed`
- [x] Invalidate `query_cache` rows affected by refreshed businesses (plan Section 3) — full-table scan per refresh (MVP)
- [x] AI summary job: batch missing summaries (gpt-4o-mini), update `businesses.ai_summary`
- [x] Error handling: failed jobs store `error_message`, retry/`next_run_after` policy — [`markDiscoveryJobFailure`](../lib/ingestion/discovery-runner.ts) sets `pending` + ~1h `next_run_after` until `max_runs`, then `failed`

### 1.3 Cron and scheduling (~2 pts + wiring)

- [x] Implement `/api/cron/discovery` (budget: e.g. 10 jobs/night)
- [x] Implement `/api/cron/refresh` (budget: e.g. 20/night)
- [x] Implement `/api/cron/ai-summaries` (budget: e.g. 15/night)
- [x] Implement `/api/cron/cache-prune` (expired `query_cache`)
- [x] Implement `/api/cron/popular-cache` (weekly pre-warm, if in MVP scope) — **stub/no-op**
- [x] Event-driven refresh hooks where specified (save bumps priority, etc.) — **save** sets `refresh_priority = 1` via [`app/api/saves/route.ts`](../app/api/saves/route.ts)

### 1.4 Scoring algorithm (~24 pts)

- [x] Hard eligibility filter (Section 11.1) — SQL or shared module; exclude before AI — `lib/scoring.ts`
- [x] Relevance scoring (query-time, Section 11)
- [x] Confidence, engagement (smoothed), freshness, exploration components — precomputed in `/api/cron/scores` + query-time relevance
- [x] Diversity re-ranking pass before top 10–15 — light category cap in `scoreAndRankCandidates`
- [x] Nightly score precomputation job (`/api/cron/scores` or combined job)
- [x] Wire search path: **never** rank candidates for AI using rating-only sort (per Section 7 Step 5)

### 1.5 Search API and AI (~18 pts)

- [x] Query normalization + hash; cache lookup on `query_cache`
- [x] Cache hit: return `response_json`; async `hit_count` increment
- [x] Cache miss: AI parse intent → structured JSON (plan Section 5 prompts)
- [x] DB query builder from intent + town/category/tag filters + **scoring pipeline** → top 15 — fetch + in-memory filter/score (not SQL builder)
- [x] Candidate payload compaction for tokens (plan Section 7 Step 6)
- [x] AI synthesis call with closed candidate set; structured output schema
- [x] `validateAIResponse` against candidate IDs; fallback template on failure
- [x] Persist cache row: `query_hash`, `normalized_query`, `response_json`, `business_ids`, `expires_at`
- [x] Optional: keyword fallback if parse JSON fails (plan edge cases)

### 1.6 Auth and saves — PRD MVP (~8 pts)

- [x] Supabase Auth: **magic link** for end users — `/login`, `/auth/callback`
- [x] Assign `admin` vs `user` for route protection — middleware + [`app/admin/*`](../app/admin/)
- [x] `user_saves`: insert/delete API or server actions; RLS — `/api/saves`
- [x] Save / unsave controls on business cards
- [x] Saved list page (simple list MVP) — `/saved`

### 1.7 Share — PRD MVP (~5 pts)

- [x] Create `shares` row pointing at `query_cache` (or equivalent FK)
- [x] `POST` or action from results UI to generate short id / UUID — `/api/shares`
- [x] Public route `/api/share/[id]` or app route that loads cached result (no AI on hit) — API + `/share/[id]` page
- [x] Track share events in `interactions` for engagement scoring

### 1.8 Engagement and feedback (~17 pts combined with sections above)

- [x] Impression logging when recommendations render
- [x] Interaction logging: click (maps/site), save, share — [`components/SearchHome.tsx`](../components/SearchHome.tsx) + [`app/api/interactions/route.ts`](../app/api/interactions/route.ts) (click increments `total_clicks`)
- [x] Feedback API: `not_relevant`, `had_bad_experience`, `hide_for_me`, `inaccurate_info` (per Section 12)
- [x] Feedback UI: overflow menu on cards; bad-experience reason chips — simplified menu (one preset bad-experience reason)
- [x] User suppressions: session + authenticated user linkage — suppressions for **signed-in** users via `user_suppressions`; session-only hide uses feedback row only
- [x] Nightly aggregation job feeding ranking signals (plan Section 12 / scoring) — [`lib/scores-nightly.ts`](../lib/scores-nightly.ts) aggregates `user_feedback` into counters + confidence penalty

### 1.9 Frontend (public app) (~11 pts)

- [x] Search input + debounce; loading and error states
- [x] Results layout; business cards (rating, tags, summary, actions)
- [x] Map / directions deep links (as in PRD “open map”)
- [x] Wire feedback and save/share affordances

### 1.10 Admin (~17 pts)

- [x] Protect `/admin/*` with admin role
- [x] Business list + search/filter
- [x] Business edit form (fields per plan Section 8); regenerate summary; refresh from Google
- [x] Ingestion trigger: create `search_jobs`, optional immediate run
- [x] Job queue status / history view
- [x] Scoring dashboard (inspect scores, distributions — plan Section 11 wireframes)
- [x] **Duplicate review & merge UI** (PRD): list candidates (similarity + distance), merge/keep/hide flows

### 1.11 Testing and quality (~12 pts)

- [x] API integration tests (search, cache, cron with mocks) — [`lib/api/search-route-post.test.ts`](../lib/api/search-route-post.test.ts), [`lib/api/cron-discovery-route.test.ts`](../lib/api/cron-discovery-route.test.ts)
- [x] Unit tests for scoring functions and eligibility — `npm test` / [`lib/scoring.test.ts`](../lib/scoring.test.ts)
- [x] Feedback/suppression logic tests — [`lib/feedback/validate.test.ts`](../lib/feedback/validate.test.ts)
- [x] E2E: search happy path — [`e2e/search.spec.ts`](../e2e/search.spec.ts) (mocked `/api/search`)
- [x] E2E: save flow; share flow and recipient page — [`e2e/share-save.spec.ts`](../e2e/share-save.spec.ts)
- [x] Load test or sanity check latencies (cache hit vs miss) — ranking sanity in [`lib/scoring.test.ts`](../lib/scoring.test.ts) (`scoreAndRankCandidates` on 300 rows &lt; 250ms); full load testing still optional for production hardening

### 1.12 Documentation and product hygiene

- [x] Update implementation plan **Section 5** architecture diagram: Stage 2 should say composite scoring + LIMIT 15 (not rating-only sort) — matches Section 7/11
- [x] Runbook: rotate keys, re-run failed jobs, clear cache — [`docs/OPERATOR-TODO.md`](./OPERATOR-TODO.md)
- [x] Basic privacy note: feedback is internal-only (Section 12) — [`docs/PRIVACY.md`](./PRIVACY.md)

---

## Phase 2 — After MVP (product + engineering)

### 2.1 Product (per PRD Phase 2)

- [ ] Iterate on AI ranking weights and relevance tuning (A/B or offline eval)
- [ ] **Collections** (group saved businesses beyond flat list)
- [ ] **Business claims** workflow (ownership verification, edit requests)

### 2.2 Sharing polish

- [ ] Open Graph meta tags for share URLs
- [ ] Richer share analytics (funnels, sources)

### 2.3 Admin and data quality

- [ ] Bulk tag assignment / management
- [ ] Cache admin: view entries, invalidate, optional warm list
- [ ] Stronger duplicate automation (batch scans, confidence scores beyond MVP manual review)
- [ ] Automated refresh scheduling UI + **freshness monitoring** dashboard
- [ ] Data quality scoring surface for operators

---

## Phase 3 — Scale, social, monetization, expansion

### 3.1 Enhanced AI / UX

- [ ] Multi-turn conversation / follow-up queries
- [ ] “Plan my day” itinerary-style flow
- [ ] Personalization using history (queries, saves) — privacy reviewed

### 3.2 Social

- [ ] Rich social preview cards (image + description)
- [ ] User reviews/tips (moderated)
- [ ] “Recommended by” or similar badges

### 3.3 Performance

- [ ] Redis or edge cache layer if Postgres cache is insufficient
- [ ] Edge caching for popular share/search responses
- [ ] Response streaming for long syntheses (if needed)

### 3.4 Monetization (PRD future)

- [ ] Featured listings / sponsored placement (policy + disclosure in UI)
- [ ] Business dashboard post-claim
- [ ] Premium user features (define scope)

### 3.5 Expansion

- [ ] Additional towns / markets
- [ ] More categories (services, rentals, etc.)
- [ ] Event/seasonal content model + ingestion

---

## Cross-cutting (ongoing)

- [x] Rate limiting for public `/api/search` (plan Appendix: in-memory MVP → Vercel KV later) — [`lib/rate-limit.ts`](../lib/rate-limit.ts), [`app/api/search/route.ts`](../app/api/search/route.ts)
- [ ] Structured application logging and error reporting (Sentry or similar)
- [ ] Backup strategy for Supabase; PITR if production
- [ ] Google Places and OpenAI **cost dashboards** and alerts
- [ ] Accessibility pass on search and admin
- [ ] Legal: ToS, privacy policy, cookie/consent if needed for analytics

---

## Summary counts (rough)

| Phase | Focus |
|-------|--------|
| **§0–1** | Full MVP per PRD + plan (~137 ticket points decomposed above) |
| **§2** | Engagement, claims, collections, ops depth |
| **§3** | Scale, social, revenue, new markets |

For ticket-to-issue mapping, keep the **Engineering Ticket Breakdown** table in [30A-IMPLEMENTATION-PLAN.md](./30A-IMPLEMENTATION-PLAN.md) Section 10 as the authoritative point rollup; this document expands it into shippable tasks.
