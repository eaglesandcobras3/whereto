# Design: Privacy-Safe Local HTML Topic Mining & Category Queue Guardrails

**ID:** 18 — Local HTML topic mining for category/intent discovery  
**Status:** Implemented (MVP): migration `20260407120000_topic_mining_privacy.sql`, pipeline in `lib/topic-mining/`, admin UI `/admin/topic-mining`.  
**Principle:** *Ephemeral processing, permanent aggregation only.*

This system lets **admins** submit **temporary** local/community HTML so the product can infer **abstract** category and intent demand signals. It must **not** archive user-generated content (UGC), identities, or reconstructable source material.

---

## 1. Privacy-Safe Workflow (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Admin: paste HTML or upload .html (in-browser or signed admin API)      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Server receives payload into volatile memory only (no DB write yet)      │
│ Optional: single-use upload URL with short TTL; object deleted after job  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Pipeline job (sync bounded or async queue):                              │
│   parse → strip boilerplate → redact PII/UGC → abstract signals →       │
│   aggregate in memory → apply thresholds → persist aggregates only        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Explicit discard: zero retention of raw HTML, raw text, snippets, quotes │
│ (see §3, §4, §7)                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Persist rows in `category_candidates` (aggregates only, §4)               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Admin review UI: candidates + scores + counts — no stored source text   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          Approve ────┼──── Reject / ignore
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ `category_build_queue` (staged work items for taxonomy/ingestion design) │
│ — never auto-publish to live categories, SEO templates, or ingestion    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Explicit non-goals:** continuous scraping, scheduled crawling of third-party URLs, or building a corpus of community posts. Input is **manual, ephemeral, admin-initiated** only.

---

## 2. Data Minimization Requirements

### 2.1 Never store

| Class | Examples |
|--------|-----------|
| Source | Raw HTML, DOM dumps, full page text |
| UGC | Post/comment body, quotes, thread titles copied verbatim |
| Identifiers | Names, usernames, handles, profile URLs, avatars, emails, phones |
| Linkage | Anything that ties a signal to an identifiable person |
| Media | Photo URLs or embedded media references tied to individuals |

### 2.2 May store (after pipeline)

Only **derived, aggregated, non-reconstructive** fields (see §4), e.g. normalized label, abstract intent type, counts, scores, abstract `source_type`, optional region/town bias, approval state, timestamps.

**Rule:** If a field could help someone reconstruct a specific post or person, it is disallowed.

---

## 3. Processing & Sanitization Pipeline

Stages are **ordered**; each stage’s output to the next must shrink sensitive surface area.

| Stage | Purpose |
|-------|---------|
| **A. Receive** | Accept payload in memory (or decrypt stream); reject if size/time limits exceeded. |
| **B. Strip structure** | HTML → plain text via allowlisted block extraction (e.g. main content regions); drop scripts, styles, `iframe`, embedded JSON-LD that might contain PII. |
| **C. Boilerplate removal** | Remove nav, footers, cookie banners, repeated chrome (heuristics + optional admin-tagged “ignore regions” **not** persisted—only applied in-session). |
| **D. PII / UGC redaction** | Before any ML or phrase extraction, run deterministic redaction (see §3.1). |
| **E. Abstract signal extraction** | Map remaining **fragments** to **canonical tokens** (e.g. “kids eat free” → intent `family_dining` candidate); do not retain fragment text after scoring. |
| **F. Normalize** | Map tokens to `normalized_category` / `category_type` / `intent_type` enums or controlled vocabulary IDs. |
| **G. Aggregate in memory** | Increment counts and rolling scores per `(normalized_key, region, town_bias, source_type)` bucket. |
| **H. Threshold** | Drop buckets below min mention count or min confidence (§5). |
| **I. Persist** | Insert/update **only** aggregate rows (§4). |
| **J. Discard** | Overwrite buffers; delete temp files; ensure no crash dumps include raw input. |

### 3.1 Sanitization / redaction rules (deterministic first)

Apply in order; when in doubt, **delete the span** rather than keep it.

1. **Patterns:** Email, phone (international formats), `@handles`, typical social profile URL patterns, “mailto:”, “tel:”.
2. **Names:** Optional blocklist of high-precision patterns only (e.g. “Posted by **X**”) — avoid aggressive NLP that might leak context; prefer removing labeled author blocks entirely.
3. **Quotes:** Remove blocks inside quotation marks over **N** characters (low **N**, e.g. 80) or markdown `>` lines.
4. **URLs:** Replace with token `URL_REDACTED` or strip query strings and path segments that look like profile IDs; better: **drop lines containing profile-like URLs** entirely.
5. **Long spans:** Cap retained segment length per block after strip; anything longer is hashed **only for dedupe within the job** using a one-way hash of the redacted form — **do not persist hash** unless policy allows (default: **no persisted hashes** of text).
6. **Images / media:** Strip `<img>`, `srcset`, video embeds.

After redaction, **no step may write redacted full text to disk or DB**—only pass short spans into a classifier that outputs **labels**, then discard spans.

---

## 4. Storage Rules

### 4.1 Allowed columns (conceptual schema)

| Field | Notes |
|--------|--------|
| `id` | Surrogate PK |
| `normalized_category` | Controlled string or FK to vocabulary row |
| `category_type` | e.g. `service`, `dining`, `activity`, `retail` |
| `intent_type` | Optional; abstract intent (e.g. `family`, `date_night`) |
| `frequency` | Integer; aggregated across one or more jobs |
| `confidence_score` | 0–1 from model + rules |
| `local_relevance_score` | 0–1; region/town fit |
| `source_type` | Abstract enum (§8) |
| `region_id` / `region_slug` | Optional scope |
| `town_bias` | Optional slug or FK; **not** a link to source |
| `first_seen_at` / `last_seen_at` | Timestamps of **aggregate** updates |
| `approval_status` | `pending`, `approved`, `rejected`, `suppressed` |
| `approved_by` | Admin user id (internal operator, not end user) |
| `notes_internal` | **Optional**; if used, must be operator notes only — **no pasted quotes** (enforce max length + profanity/PII scanner) |

### 4.2 Forbidden

- `source_html`, `raw_text`, `snippet`, `example_post`, `url`, `external_thread_id`, screenshots, embeddings of raw text (unless legally reviewed and justified—**default off**).

### 4.3 Deduplication

Merge into existing `category_candidates` by unique key `(normalized_category, intent_type, region_id, town_bias, source_type)` and **increment `frequency`** — no per-event rows for each paste.

---

## 5. Aggregation Thresholds

| Rule | Suggested default (tunable) |
|------|------------------------------|
| Min mentions to **persist** new candidate | ≥ 3 mentions **within the same job** OR ≥ 2 independent admin jobs in 30 days (implementation choice: job-local vs global — prefer **global merge** with decay) |
| Min confidence | e.g. ≥ 0.55 to write; ≥ 0.35 to show as “low confidence” in UI |
| One-off suppression | Single mention + high sensitivity keywords (e.g. medical, legal) → **discard** |
| Max candidates per job | Cap (e.g. 50) to limit noise and cost |
| Decay | Older mentions contribute less to `local_relevance_score` (EWMA or half-life) **without** storing event timestamps per mention |

**Preference:** One aggregate row per conceptual candidate, not an event log.

---

## 6. Queue Integration (Staged Flow)

```
temporary HTML (ephemeral)
        → sanitized extraction (no persistence of raw)
        → category_candidates (aggregates + pending)
        → [ADMIN REVIEW]
        → category_build_queue (approved items only)
        → [separate human or automated taxonomy pipeline]
        → live categories / SEO / ingestion (ONLY via existing controlled processes)
```

### 6.1 Tables (conceptual)

- **`category_candidates`:** Rows as in §4; created/updated by mining jobs only.
- **`category_build_queue`:** Work items created **only** when an admin approves a candidate (or bulk approves with audit). Fields might include: `candidate_id`, `priority`, `suggested_slug`, `payload_for_taxonomist` (structured JSON **without** source text — e.g. suggested `google_types`, copy hints **generated**, not copied).

### 6.2 Hard guardrails

- No API may promote from mining directly to `categories` or `search_jobs` without passing through `category_build_queue` and a defined “publish” action.
- Mining jobs run with a **`mining_run_id`** for audit: store **counts** and **timing** in `mining_run_audit` (optional) — **not** content.

---

## 7. Logging & Observability Guardrails

### 7.1 Allowed in logs / metrics

- Job id, `mining_run_id`, duration, stage timings
- Counts: bytes in (optional aggregate bucket), blocks processed, candidates produced, candidates dropped by rule
- Error codes: `REDACTION_FAILURE`, `MODEL_TIMEOUT`, `THRESHOLD_REJECT`
- Final **category-level** summary line: e.g. `upserted_candidates=12`

### 7.2 Forbidden

- Raw HTML, decoded text, stack traces that include request body
- Snippets, quotes, filenames that reveal source site or user
- Any `console.log` of intermediate strings from the page

**Implementation:** Structured logging with allowlisted fields; scrubber on error middleware for admin routes.

---

## 8. Source Abstraction (`source_type`)

### 8.1 Allowed (enum examples)

- `manual_local_html_input`
- `local_community_discussion` *(abstract — does not name platform or group)*
- `regional_trend_input`
- `operator_curated_sample`

### 8.2 Disallowed

- Platform names tied to crawl targets, group names, thread titles, URLs, user handles.

Admin may select `source_type` from a dropdown **before** paste (default `manual_local_html_input`) to avoid inferring sensitive metadata from HTML.

---

## 9. Legal / Privacy Positioning (Product Statement)

This feature exists for:

- **Trend detection** and **topic mining**
- **Category / intent discovery** to improve local discovery product configuration

It is **not** for:

- Archiving UGC or social posts
- Storing identities or rebuilding discussions
- Surveillance or marketing to individuals

**Ephemeral processing, permanent aggregation only** — raw input and reconstructable text never enter durable storage.

---

## 10. Admin UX Requirements

### 10.1 Must show

- Table of **candidates**: `normalized_category`, `category_type`, `intent_type`, `frequency`, `confidence_score`, `local_relevance_score`, `source_type`, region/town bias, `approval_status`, `last_seen_at`
- Actions: **Approve** (→ queue), **Reject**, **Suppress** (hide + do not re-surface), optional **merge** with another candidate
- Job history: time, operator, **counts only** — no content preview

### 10.2 Must not show

- Stored raw HTML or “preview of source” from DB (there is none)
- Names, handles, quotes, or “example posts”
- If live preview is ever needed during paste, it must be **client-only** and **cleared** on submit; server never echoes input back in UI lists

### 10.3 Nudges

- Banner: *“Do not paste private messages or DMs. Paste only public, anonymized context you have rights to use for product planning.”*
- Size limits and warning for large pastes

---

## 11. Output Checklist (Requirements Traceability)

| Requirement | Where addressed |
|-------------|-----------------|
| Privacy-safe workflow | §1 |
| Sanitization rules | §3, §3.1 |
| Storage constraints | §2, §4 |
| Queue integration | §6 |
| Logging restrictions | §7 |
| Admin review | §6, §10 |
| Learn from local signal without retaining personal/third-party content | §1–§4, §9 |

---

## 12. Implementation Notes (Future Engineering)

- **Admin-only** routes; rate limit; max payload size (e.g. 512 KB–2 MB).
- **No background fetch** of URLs pasted inside HTML (strip or reject off-origin loads).
- Prefer **on-server** processing in a **stateless** function with explicit `finally` cleanup.
- Optional: run extraction model on **redacted token IDs** only if using a tokenizer that never sends raw substrings to third parties without DPA — default to **in-house** or **zero-retention** API settings if using OpenAI etc.

When this is implemented, add a migration for `category_candidates`, `category_build_queue`, and optional `mining_run_audit`, and link this doc from `docs/whereto30a-implementation-plan.md` or the admin runbook.
