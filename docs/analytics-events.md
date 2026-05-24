# Google Analytics (GA4) click & event tagging

## Mechanism

- **Loader:** `components/analytics/GoogleAnalytics.tsx` + `lib/analytics/google-measurement-id.ts` (`G-781F48KRLR` default; override with `NEXT_PUBLIC_GA_MEASUREMENT_ID`, or set to empty string to disable).
- **Delegated clicks:** `components/analytics/AnalyticsClickCapture.tsx` listens in capture phase for elements with **`data-analytics-event`** (and optional **`data-analytics-category`**, **`data-analytics-label`**).
- **Helper:** **`gaClickProps({ event, category?, label? })`** in `lib/analytics/ga-click-props.ts` — spread onto `<Link>`, `<a>`, `<button>`.
- **Programmatic:** **`gaEvent(name, params?)`** in `lib/analytics/gtag-runner.ts` — search submits, pagination, filters, form success paths.

## Naming convention

| `event` (examples)   | Typical `category`     | Typical `label`        |
|----------------------|-------------------------|-------------------------|
| `nav_click`          | Surface (e.g. `header_browse`) | Route slug / stable id |
| `cta_click`          | Placement (e.g. `footer_company`) | Action id |
| `outbound_click`     | Surface + channel       | Short host / `instagram` |
| `search`             | (params)               | `search_term`, `source` |
| `search_filter_change` | (params)            | `filter`, `value` |
| `pagination_click`    | (params)              | `page`, `browse_mode` |
| `ui_open`             | `header`, etc.         | Panel id |

Reports in GA4: use **Events** plus **category/label** as custom dimensions if you register `event_category` / `event_label` as CD (or derive from Explore).

## Surfaced audited (instrumented)

**Global chrome:** Navbar (logo, search, menu, browse links, desktop auth), Navbar mobile menu, SiteFooter (towns/company/legal/social/newsletter).

**Browse & conversion:** Homepage hero/links/chips/grid/CTAs, featured masonry, list-business CTA, search results + sidebar + pagination + chips + filters, business cards incl. outbound website, markdown embed cards, town/SEO rec lists incl. outbound website, browse link lists (`BusinessBrowseLinksList` with `analyticsListKey`), town cards, discovery carousels/grids where applicable.

**Supporting:** Business detail page key links/CTAs, disclaimer links, breadcrumb-heavy pages (patterns), auth/share/saved/supporting links where high-traffic.

**Forms:** Navbar search `gaEvent`, hero search `gaEvent`, listing feedback submit `gaEvent` on success.

Re-run **`rg 'gaClickProps|gaEvent'`** occasionally to verify new UI keeps parity.
