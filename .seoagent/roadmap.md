# SEO Roadmap — whereto30a.com

Prioritized from the 2026-08-16 live audit. Check items off as they ship.

## P0 — Fix crawl/index waste

- [x] Remove `/stays` from the live sitemap while rentals are feature-flagged off (or enable rentals and serve a real hub)
- [x] Stop shipping ellipsis-truncated `<title>` segments on towns/guides — rewrite to fit the layout budget

## P1 — SERP + AI discoverability

- [x] Shorten `/areas` and `/businesses` titles to ≤60 characters
- [x] Decide AI-bot policy: allow GPTBot/ChatGPT-User (and optionally CCBot) for public content, or stop implying AI crawl readiness via llms.txt alone
- [x] Rewrite category-hub meta description templates into natural English

## P2 — Architecture cleanup

- [x] Add `/about`, `/privacy`, `/terms` to the sitemap (and expand About title) — or intentionally noindex them
- [x] Collapse duplicate browse hubs (legacy vs unified) with 301s + single sitemap entry per topic
- [x] Align guide H1s with title/query intent where they diverge

## P3 — Measurement + growth

- [ ] `seoagent login` + connect Google Search Console, then `seoagent indexing`
- [ ] Phase 2 keyword research + content plan (clusters for towns, beach access, first-timers, dining)
- [ ] Optional: strengthen one inbound link to `/about` from homepage/footer

---

## 90-day SEO plan (2026-08-18)

Competitive target: close the **authority + URL surface** gap vs discover30a.com without copying their spam/low-quality patterns. Full narrative in agent session; milestones below.

### Month 1 — Baseline + indexable inventory

**Week 1–2: Measurement**
- [ ] Connect GSC (`seoagent login` → `seoagent indexing`)
- [ ] Record baseline: indexed pages, top queries, avg position, impressions
- [ ] Set `INDEXNOW_KEY` + run `/api/cron/indexnow` after deploys (`lib/seo/indexnow.ts`)
- [ ] Export IRSE scores for all public route kinds (`/admin/irse`, threshold 80 in `lib/irse/weights.ts`)

**Week 3–4: Business pages (biggest quick win)**
- [ ] Add IRSE-gated business URLs to sitemap — today `SITEMAP_EXCLUDED_PATH_PREFIXES` blocks `/business/` (`lib/seo/sitemap-strategy.ts`)
- [ ] Start with listings scoring ≥80 overall; expand as content improves
- [ ] Wire IndexNow to ping new/updated business URLs on publish
- [ ] Strengthen internal links: town pages → top businesses; category hubs → featured listings

**Month 1 target:** sitemap grows from ~102 → **250+** URLs; first business pages appearing in GSC.

### Month 2 — Programmatic town × intent pages

**Week 5–6: Ship SEO landing routes (TDD gap)**
- [ ] Add route `app/town/[slug]/[intentSlug]/page.tsx` (or equivalent) per `docs/TDD-SEO-TOWNS.md`
- [ ] Render from `query_cache` rows keyed by `lib/seo/query-cache-keys.ts` (`category_restaurants|town_rosemary-beach`, etc.)
- [ ] Gate publish: `seo_eligible === true` (≥3 businesses, `lib/cron/recommendation-precompute.ts`)

**Week 7–8: Precompute + sitemap**
- [ ] Run precompute for all 15 towns × 18 templates (~270 jobs max)
- [ ] Emit eligible town/intent URLs in sitemap (priority ~0.7)
- [ ] Enable PostHog `category_hub_seo` when category leaf hubs are ready (`lib/feature-flags.ts`)

**Month 2 target:** sitemap **350–500** URLs; ranking for long-tail (“best coffee rosemary beach”, “kid friendly restaurants seaside”).

### Month 3 — Content, rentals, authority

**Week 9–10: Editorial + guides**
- [ ] Keyword cluster doc: first-timers, beach access, town comparisons, dining (`.seoagent/` or `docs/`)
- [ ] RankScore sync: 2–4 new guides/month (`npm run sync:rankscore`, `docs/OPERATOR-TODO.md`)
- [ ] Cross-link guides ↔ town hubs ↔ intent pages

**Week 11: Rentals decision**
- [ ] If inventory ready: enable PostHog `rentals` → `/stays` enters sitemap (`lib/seo/fetch-sitemap-entries.ts`)
- [ ] If not ready: publish one editorial “30A vacation rentals guide” instead of thin directory pages

**Week 12: Off-site authority**
- [ ] “List your business” outreach → 10–20 local citations/backlinks
- [ ] Launch @WhereTo30A (or embed feed) — discover30a’s social loop drives branded search
- [ ] Recalibrate IRSE weights after 90 days of GSC index labels (`scripts/calibrate-irse.ts`)

**Month 3 target:** measurable impression growth; **5–10 referring domains**; first page-1 rankings on town+intent terms.

### Do NOT copy from discover30a

- Casino/spam blog posts (their sitemap includes thousands of hacked URLs)
- Single mega-pages with 80+ listings and no structure
- Lorem ipsum / duplicate homepage blocks

### Success metrics (90-day)

| Metric | Baseline (Aug 2026) | 90-day goal |
|--------|---------------------|-------------|
| Sitemap URLs | ~102 | 400–600 |
| GSC indexed pages | Unknown (connect GSC) | 2× sitemap eligible |
| Referring domains | ~0 | 5–10 quality |
| Ranked keywords (Ahrefs/Semrush) | Untracked | 200+ |
| Organic clicks/mo | Near zero | Upward trend; 3+ town/intent terms in top 20 |
