# Product Requirements Document (PRD)

## Index Readiness Scoring Engine (IRSE)

**Status:** Draft → MVP in progress  
**Owner:** WhereTo30A Product  
**Related:** [PRD-SEO-TOWNS.md](./PRD-SEO-TOWNS.md), [OPERATOR-TODO.md](./OPERATOR-TODO.md)

---

### Vision

Create an internal scoring engine that predicts whether a page is likely to be indexed by Google before it is submitted for indexing.

The system should not attempt to replicate Google’s algorithm. Instead, it should learn the characteristics of successful pages on WhereTo30A and provide a measurable, repeatable quality score that guides editorial decisions, publishing workflows, and SEO improvements.

The scoring engine becomes the foundation for all future SEO tooling, dashboards, publishing rules, and business onboarding.

---

### Background

Current SEO tooling identifies technical issues but does not explain why Google chooses to index some pages while ignoring others.

Existing tools answer questions like:

- Is metadata missing?
- Is the schema valid?
- Are there broken links?
- Is the page crawlable?

They do not answer:

**Why is this page still not indexed?**

The lack of measurable quality metrics makes it difficult to prioritize improvements or understand whether changes are increasing the likelihood of indexing.

---

### Problem Statement

There is currently no objective way to determine whether a page is “ready” for Google.

Publishing decisions are subjective. SEO improvements are reactive. Google Search Console provides limited actionable feedback.

The platform needs a measurable quality model.

---

### Goals

**Primary goal:** Predict indexability before Google does.

**Secondary goals:**

- Standardize page quality
- Prioritize editorial work
- Reduce manual SEO audits
- Improve business onboarding
- Power future SEO dashboards
- Provide measurable improvement over time

---

### Non Goals

This project is NOT attempting to:

- Replicate Google’s ranking algorithm
- Predict keyword rankings
- Replace Search Console
- Replace Ahrefs or Semrush
- Guarantee indexing

---

### Core Principle

The system should answer one question:

> If we were Google, would we index this page?

---

### Product Overview

**Input:** business / guide / town / area / category slug  

→ Scoring Engine → Overall Score → Subscores → Flags → Recommendations → Index Recommendation

---

### MVP Scope

Version 1 evaluates one page at a time for all entity kinds:

- `business` → `/business/{slug}`
- `guide` → `/guide/{slug}`
- `town` → `/town/{slug}`
- `area` → `/area/{slug}`
- `category` → `/{public-segment}` (e.g. `/restaurants`)

Example: `scorePage({ kind: "business", slug })` returns overall score, category scores, flags, recommendations, and index recommendation.

The existing boolean gate in `lib/seo/business-index-readiness.ts` remains for SEO-audit / sitemap eligibility. IRSE `indexReady` means `overallScore >= 80`.

---

### API Response

```json
{
  "kind": "business",
  "slug": "amavida-coffee-roasters-seaside",
  "path": "/business/amavida-coffee-roasters-seaside",
  "overallScore": 84,
  "indexReady": true,
  "band": "index_ready",
  "confidence": 0.87,
  "scores": {
    "entity": 98,
    "content": 81,
    "seo": 95,
    "discovery": 73,
    "trust": 90
  },
  "flags": [
    {
      "severity": "warning",
      "code": "discovery_category_only",
      "message": "Only linked from category pages."
    }
  ],
  "recommendations": [
    "Add nearby businesses.",
    "Increase editorial content.",
    "Add visitor tips."
  ]
}
```

---

### Scoring Categories

| Category | Weight | Measures |
|----------|--------|----------|
| Entity | 25% | Google can clearly understand the entity |
| Content | 25% | Usefulness / uniqueness |
| SEO | 20% | Technical readiness |
| Discovery | 15% | Internal discoverability |
| Trust | 15% | Confidence in the information |

Checks without a data model (e.g. business amenities/FAQs) emit `info`/`warning` flags and contribute partial or zero credit for that sub-check — they do not invent new schema.

---

### Flags

Severity: `critical` | `warning` | `info`

Every issue is a structured flag with a stable `code` and actionable `message`.

---

### Thresholds

| Score | Band |
|-------|------|
| 95–100 | Exceptional |
| 90–94 | Featured Ready |
| 80–89 | Index Ready |
| 70–79 | Needs Improvement |
| 60–69 | Needs Significant Work |
| Below 60 | Not Ready |

---

### Confidence Score

Blend of:

1. Fraction of applicable checks with data present
2. Once enough GSC-labeled peers exist, proximity of this score vector to the indexed cohort centroid

---

### Calibration

Ground truth: Google Search Console URL Inspection API **or** CSV route lists.

**CSV mode (preferred for local tuning):**

1. Provide `indexed.csv` and `notindexed.csv` of site paths
2. Score every listed page with IRSE
3. Measure indexed mean − not-indexed mean
4. Optionally search category weight mixes to widen that gap (`--tune-weights`)
   - Default: tune on business/guide/town/area only (exclude thin category hubs)
   - Per-weight caps + regularization toward current weights
   - Validates full-set separation before recommending `--apply-weights`

```bash
npm run calibrate:irse -- \
  --indexed=docs/irse-indexed.csv \
  --not-indexed=docs/irse-notindexed.csv \
  --tune-weights
```

**GSC sample mode:**

1. Sample published URLs across kinds
2. Inspect (cached 7 days) until ~50 indexed + ~50 not-indexed
3. Score labeled set
4. Adjust weights until indexed pages consistently score higher

Target separation: indexed mean − non-indexed mean ≥ **15** points.

CLI: `npm run calibrate:irse` (calibration) or `npm run calibrate:irse -- --score-all` (persist snapshots for every published page; no GSC).

---

### Future Versions

- **V2:** Batch / nightly scoring + score history
- **V3:** Deeper Search Console comparison over time
- **V4:** Publishing workflow gates + sitemap eligibility
- **V5:** Business-owner listing quality UX
