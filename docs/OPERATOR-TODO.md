# Operator TODO — Site-wide

General operator tasks for WhereTo30A (env, deploy, shared infra).

**Business Portal** has its own dedicated checklist: [OPERATOR-TODO-business-portal.md](OPERATOR-TODO-business-portal.md).

---

## RankScore → Guides sync

Pull completed RankScore articles into `public.guides` (published at `/guide/[slug]` and listed on `/guides`).

### Setup

- [ ] In RankScore: **Integrations → API → Manage** → generate API key (copy once).
- [ ] Add env vars (local `.env.local` and Vercel production):
  - `RANKSCORE_API_BASE` — e.g. `https://dashboard.rankscore.co/api/integrations/v1`
  - `RANKSCORE_API_KEY` — your project API key
  - `CRON_SECRET` — already used by other crons; required for `/api/cron/rankscore-guides`
- [ ] Run SQL migrations in Supabase SQL editor:
  - [scripts/migrations/guides-rankscore-article-id.sql](../scripts/migrations/guides-rankscore-article-id.sql) (`rankscore_article_id`)
  - [scripts/migrations/guides-external-image-urls.sql](../scripts/migrations/guides-external-image-urls.sql) (`main_image_url` / `hero_image_url` for RankScore CDN/Pexels heroes)

### Manual sync (first run / debugging)

```bash
npm run sync:rankscore -- --dry-run   # preview
npm run sync:rankscore -- --limit 5   # small batch
npm run sync:rankscore                # full sync
```

### Scheduled sync (Vercel)

Cron route: `GET /api/cron/rankscore-guides` (**weekly**, Mondays 13:00 UTC in `vercel.json`).  
Optional: `?limit=20` for a capped run.

**Create-only:** if a guide slug (or RankScore article id) already exists in `guides`, the sync skips it — no updates, no republish. Only new articles are inserted.

Verify after deploy:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://whereto30a.com/api/cron/rankscore-guides?limit=1"
```

### Notes

- Uses RankScore `content_markdown` only (stored in `guides.content`; rendered as markdown on `/guide/[slug]`).
- Hero images: RankScore `hero_image_url` is downloaded to Supabase (`guides/rankscore/{slug}/hero.webp`) and stored on `guides.main_image_url` / `hero_image_url`. Inline markdown images stay as-is.
- Re-sync is **create-only**: existing slugs are skipped; RankScore edits do not overwrite live guides.
- Rate limit: ~1 request/sec to stay under RankScore’s 60 req/min cap.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-19 | RankScore → guides sync: env vars, SQL migration, cron `/api/cron/rankscore-guides`, `npm run sync:rankscore` |
| 2026-06-17 | Created site-wide stub; portal checklist split to OPERATOR-TODO-business-portal.md |
