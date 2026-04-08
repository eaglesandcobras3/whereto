# PRD — SEO & Multi-Level Location Discovery

**Supplements** [PRD.md](./PRD.md) (conversational MVP). This document is the product source of truth for **programmatic SEO**, **town hubs**, and **shared recommendation sets** across AI, web, and share.

**Related:** [TDD-SEO-TOWNS.md](./TDD-SEO-TOWNS.md) (engineering), [UX-BRIEF-TOWNS-SEO.md](./UX-BRIEF-TOWNS-SEO.md) (design).

---

## 1. Overview

**WhereTo30A** (`whereto30a`) is hyperlocal discovery for Florida’s 30A corridor: structured business data, AI recommendations, **programmatic SEO**, and **town-based** experiences. The product must work as:

- A conversational AI guide
- A scalable SEO engine for high-intent queries

## 2. Objectives

- High-quality local discovery per town and region
- SEO pages that rank for category + location and intent + location queries
- **One recommendation system** backing AI, SEO, town pages, and shares
- Low AI cost via reuse and precomputation
- Architecture that can add regions beyond 30A

## 3. Core concepts

| Concept | Definition |
|--------|------------|
| **Region** | Primary area (e.g. 30A corridor) |
| **Town** | Sub-area (Rosemary Beach, Seaside, Alys Beach, …) |
| **Recommendation set** | Ranked businesses + metadata for a normalized query + location scope; stored in DB (extends `query_cache`) and reused everywhere |

## 4. Experience

- **Entry:** Organic search (SEO), direct town URLs, AI search
- **Town hub:** Intro, top categories, intent sections, featured + nearby (“worth the short drive”), AI entry
- **SEO pages:** e.g. “Best coffee in Rosemary Beach”, “Kid-friendly restaurants in 30A” — intro, ranked list, internal links
- **AI:** Natural language → same normalization and ranking path as other surfaces

## 5. Functional requirements

- **Location hierarchy:** Region-level and town-level content; shared `businesses` data
- **No duplicate ranking logic** — single pipeline (see TDD)
- **Query normalization** — canonical `query_key` (e.g. `best_coffee|rosemary_beach`) for dedupe and SEO
- **SEO generation** — from recommendation sets; avoid thin/duplicate pages; `seo_eligible` gating
- **Nearby** — adjacent towns labeled clearly
- **Internal linking** — categories, towns, related queries, business pages
- **AI cost** — one summary per set where possible; cache aggressively

## 6. Non-functional

- Fast loads (SSG/ISR preferred for SEO pages)
- Strong metadata and crawl-friendly structure
- Consistent data across surfaces

## 7. Success metrics

- SEO: organic traffic, rankings, indexed pages
- Product: engagement, repeat use, shares
- Quality: negative feedback rate, satisfaction signals

## 8. Risks

- Duplicate/thin SEO content
- Stale listings
- Over-generation of low-value pages
- Runaway AI cost

## 9. Display policy (ratings)

**UX brief** prefers an editorial, low-noise surface without prominent star ratings. **Decision for Phase 2:** On consumer-facing pages (home AI results, town hubs, SEO pages, business detail), **do not show third-party star ratings prominently**; rely on summaries, tags, and saves. Admin and internal tools may still show ratings for ops. Designers may propose a muted secondary treatment later; any change updates this section.

---

## 10. Future

Additional regions, personalization, sponsored placements, claims, deeper conversational flows.
