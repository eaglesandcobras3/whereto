# SEO Roadmap — whereto30a.com

Prioritized from the 2026-08-16 live audit. Check items off as they ship.

## P0 — Fix crawl/index waste

- [ ] Remove `/stays` from the live sitemap while rentals are feature-flagged off (or enable rentals and serve a real hub)
- [ ] Stop shipping ellipsis-truncated `<title>` segments on towns/guides — rewrite to fit the layout budget

## P1 — SERP + AI discoverability

- [ ] Shorten `/areas` and `/businesses` titles to ≤60 characters
- [ ] Decide AI-bot policy: allow GPTBot/ChatGPT-User (and optionally CCBot) for public content, or stop implying AI crawl readiness via llms.txt alone
- [ ] Rewrite category-hub meta description templates into natural English

## P2 — Architecture cleanup

- [ ] Add `/about`, `/privacy`, `/terms` to the sitemap (and expand About title) — or intentionally noindex them
- [ ] Collapse duplicate browse hubs (legacy vs unified) with 301s + single sitemap entry per topic
- [ ] Align guide H1s with title/query intent where they diverge

## P3 — Measurement + growth

- [ ] `seoagent login` + connect Google Search Console, then `seoagent indexing`
- [ ] Phase 2 keyword research + content plan (clusters for towns, beach access, first-timers, dining)
- [ ] Optional: strengthen one inbound link to `/about` from homepage/footer
