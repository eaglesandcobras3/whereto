---
domain: whereto30a.com
audited_at: 2026-08-16T14:51:00Z
pages_audited: 30
critical: 0
high: 2
medium: 5
low: 2
origin: https://whereto30a.com
indexing_coverage: unverified
---

# Audit — whereto30a.com

Live crawl: `.seoagent/audit/evidence.md` (30/30 pages, `capture_complete: true`, origin https://whereto30a.com).
Machine rollup (`.seoagent/audit/findings.md`): **0 confirmed technical findings** — every crawled page passed canonical / meta description / single H1 / structured data / image-alt / server-render checks; robots.txt + sitemap.xml fetched successfully.

Indexing coverage **not verified** (needs free `seoagent login` + Search Console). Do not infer indexed status from `site:` searches.

## Critical

_(none)_

## High

- [x] **`/stays` is in the live sitemap but redirects to `/`** — rentals are feature-flagged off in production, so Google is asked to crawl a hub that soft-redirects to the homepage. (Confirmed)
  - URL: https://whereto30a.com/stays
  - Evidence: live HEAD returns `307` → `/`; sitemap.xml includes `https://whereto30a.com/stays`; evidence.md § https://whereto30a.com/stays shows homepage title/H1/canonical after follow
  - Recommendation: Until rentals launch, remove `/stays` from the sitemap generator (or gate it on the same rentals flag). Prefer a 404/410 or keep the redirect only after the URL is off the sitemap.
  - Fixed 2026-08-16: `/stays` hub + rental URLs are only emitted when `includeRentals` is true (wired to the rentals feature flag in `fetchSitemapEntries`).

- [x] **Many high-value titles are pre-truncated with an ellipsis before the brand suffix** — SERP titles waste characters on `…` instead of a complete benefit phrase. Affects towns, guides hub, and editorial guides. (Confirmed)
  - URLs: https://whereto30a.com/towns, https://whereto30a.com/guides, https://whereto30a.com/town/rosemary-beach, https://whereto30a.com/town/seaside, https://whereto30a.com/guide/ultimate-30a-first-timers-guide, https://whereto30a.com/guide/guide-to-rosemary-beach-florida (and matching town pattern in evidence)
  - Evidence: evidence.md titles literally contain `…` (e.g. towns: `30A Beach Towns Guide: Compare Rosemary,… | WhereTo30A`; Rosemary Beach: `Rosemary Beach Florida: Where to Stay, Eat,… | WhereTo30A`)
  - Recommendation: Rewrite title segments to fit the ~45-char layout budget without ellipsis — lead with the primary keyword and one concrete hook (town name + stay/eat/beach angle), not a long phrase that gets cut.
  - Fixed 2026-08-16: title truncation no longer emits `…`; towns/guides hubs rewritten to fit; long CMS titles fall back to compact complete titles via `preferTitleWithinBudget` / `townTitleSegment`.

## Medium

- [x] **AI crawlers are blocked while `llms.txt` invites AI discovery** — GPTBot, ChatGPT-User, and CCBot are Disallow-all, which undercuts AEO/GEO even though an llms.txt map exists. (Confirmed)
  - Evidence: evidence.md § robots.txt raw contents (`User-Agent: GPTBot` / `ChatGPT-User` / `CCBot` → `Disallow: /`); live `https://whereto30a.com/llms.txt` returns 200 with hub + guide links
  - Recommendation: Decide deliberately — either allow those bots (at least for public guide/town/business paths) or treat llms.txt as human/docs-only and stop implying AI-agent crawl readiness.
  - Fixed 2026-08-16: removed blanket AI-bot blocks; GPTBot/ChatGPT-User/CCBot inherit the same public allow + private disallow rules as `*`.

- [x] **Hub titles exceed the ~60-character SERP budget** — `/areas` (64) and `/businesses` (68) will truncate in Google. (Confirmed)
  - Evidence: evidence.md § https://whereto30a.com/areas title `30A Shopping Districts & Town Centers | Areas Guide | WhereTo30A` (64); § https://whereto30a.com/businesses title `Businesses on 30A | Shops, Restaurants, Services & More | WhereTo30A` (68)
  - Recommendation: Shorten to ~50–60 chars with primary keyword first (e.g. `30A Businesses: Restaurants, Shops & Services | WhereTo30A`).
  - Fixed 2026-08-16: areas → `30A Town Centers & Shopping Districts` (50 with brand); businesses → `30A Businesses: Restaurants, Shops & Services` (58 with brand).

- [x] **Indexable `/about`, `/privacy`, and `/terms` are excluded from the sitemap** — still live and indexable via links, but not submitted via sitemap. (Confirmed)
  - Evidence: `seoagent sitemap` missing list includes `/about`, `/privacy`, `/terms`; live HEAD all return 200; `/about` title is only 18 chars (`About | WhereTo30A`)
  - Recommendation: Add these three to the sitemap (or noindex them if they should stay utility-only). Expand the About title toward ~50–60 chars with a brand + mission keyword.
  - Fixed 2026-08-16: added as `SITEMAP_POLICY_PAGES`; About title absolute `About WhereTo30A: Local 30A Guides`.

- [x] **Category hub meta descriptions are template-awkward** — “Browse N {noun} along Scenic 30A…” reads as incomplete English and weakens CTR. (Confirmed)
  - Evidence: evidence.md § https://whereto30a.com/businesses/food-and-drink meta `Browse 171 food & drink along Scenic 30A across 15 towns…`; same pattern on shopping, medical, professional, rentals, etc.
  - Recommendation: Humanize templates: `Browse 171 food and drink spots on Scenic 30A across 15 towns — restaurants, coffee, bars, and more.`
  - Fixed 2026-08-16: `buildBrowseGroupHubMetaDescription` uses natural noun phrases (`Explore 171 food and drink spots…`).

- [x] **Legacy + unified browse hubs both return 200 for overlapping topics** — risk of keyword cannibalization between parallel category URLs. (Confirmed coexistence; cannibalization impact Hypothesis)
  - Evidence: live HEAD 200 for both `/businesses/medical` and `/businesses/health-and-medical`; both `/businesses/professional` and `/businesses/professional-and-financial`; both in sitemap URL list from `seoagent sitemap`
  - Recommendation: Pick one canonical hub per topic, 301 the duplicate, and keep only the winner in the sitemap + internal links.
  - Fixed 2026-08-16: sitemap emits unified rollups only; legacy twins 301 to unified via `LEGACY_BROWSE_GROUP_REDIRECTS`.

## Low

- [x] **Guide H1 and `<title>` often diverge** — fine for voice, but weakens query alignment when the H1 answers a different question than the title. (Confirmed on samples)
  - Evidence: live guide `public-beaches-30a` title `Explore Public Beaches on Florida's 30A | WhereTo30A` vs H1 `Does 30A Have Public Beaches?`
  - Recommendation: Align the H1 with the primary query intent when the title is already ranking-oriented (or vice versa).
  - Fixed 2026-08-16: guide display H1 / schema / breadcrumbs prefer `seo_title` when present.

- [ ] **Internal-link analyzer: no orphans among scanned routes** — a few utility pages are weakly linked (`/about`, `/discover`, `/feedback` at 1 inbound). (Confirmed from `seoagent internal-links`)
  - Recommendation: Optional — add one contextual About link from homepage footer/mission copy if About should rank; leave auth/utility pages alone.

## What's Working

- HTTPS with HSTS; HTTP→HTTPS 308 (Confirmed via live HEAD)
- Server-rendered pages with substantial body copy (homepage ~793 words; towns often 800–1600+)
- Canonical, meta description, Open Graph, Twitter card present on every crawled page (evidence.md rollup)
- JSON-LD in place: `Organization` + `WebSite` sitewide; `Article` + `BreadcrumbList` on guides; `TouristDestination` on town pages; `ItemList`/`CollectionPage` on hubs
- Every crawled image has alt text
- Live sitemap: 102 URLs including towns, areas, guides, and business hubs; declared in robots.txt
- `llms.txt` published with primary hubs and policies
- robots.txt correctly Disallows private/auth/utility surfaces (`/admin/`, `/api/`, `/search`, `/ask`, etc.)

## Notes for next session

- Connect GSC via `seoagent login` then run `seoagent indexing` for authoritative coverage.
- Keyword strategy / content plan not started yet (Phase 2).
- Do **not** recommend adding Organization/WebSite/canonical/OG — already present on live pages (see findings.md “Already present”).
