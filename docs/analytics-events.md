# PostHog click & event tagging

## Mechanism

- **Loader:** `components/analytics/PostHogProvider.tsx` + `lib/analytics/posthog-config.ts` (`NEXT_PUBLIC_POSTHOG_KEY` required; set to empty string to disable). Optional **`NEXT_PUBLIC_POSTHOG_HOST`** (defaults to `https://us.i.posthog.com`).
- **Pageviews:** `components/analytics/PostHogPageView.tsx` fires `$pageview` on App Router navigations.
- **Delegated clicks:** `components/analytics/AnalyticsClickCapture.tsx` listens in capture phase for elements with **`data-analytics-event`** (and optional **`data-analytics-category`**, **`data-analytics-label`**).
- **Helper:** **`gaClickProps({ event, category?, label? })`** in `lib/analytics/ga-click-props.ts` — spread onto `<Link>`, `<a>`, `<button>`.
- **Programmatic:** **`captureEvent(name, params?)`** (alias **`gaEvent`**) in `lib/analytics/gtag-runner.ts` — search submits, pagination, filters, form success paths.

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

In PostHog, filter or break down events by `event_category`, `event_label`, and other properties sent with each capture.

## Surfaced audited (instrumented)

**Global chrome:** Navbar (logo, search, menu, browse links, desktop auth), Navbar mobile menu, SiteFooter (towns/company/legal/social/newsletter).

**Browse & conversion:** Homepage hero/links/chips/grid/CTAs, featured masonry, list-business CTA, search results + sidebar + pagination + chips + filters, business cards incl. outbound website, markdown embed cards, town/SEO rec lists incl. outbound website, browse link lists (`BusinessBrowseLinksList` with `analyticsListKey`), town cards, discovery carousels/grids where applicable.

**Supporting:** Business detail page key links/CTAs, disclaimer links, breadcrumb-heavy pages (patterns), auth/share/saved/supporting links where high-traffic.

**Forms:** Navbar search `gaEvent`, hero search `gaEvent`, listing feedback submit `gaEvent` on success.

Re-run **`rg 'gaClickProps|gaEvent|captureEvent'`** occasionally to verify new UI keeps parity.

## Vacation rentals (`rentals` flag)

Do **not** send guest emails, phones, or exact addresses.

| Event | Typical properties |
|-------|-------------------|
| `rental_search_started` | `source`, `town_slug?`, `has_dates`, `guests?` |
| `rental_search_completed` | `town_slug?`, `guests?`, `bedrooms?`, `filter_keys[]`, `result_count?` |
| `rental_filter_applied` | `filter`, `value`, `result_count?` |
| `rental_result_viewed` | `property_id` / label, position via data attrs |
| `rental_property_viewed` | `property_id`, `business_id` |
| `rental_manager_viewed` | business slug / id |
| `rental_booking_click` | `property_id`, `business_id`, `destination_host?`, `has_dates`, `guests?`, `source` |
| `rental_partner_application_started` | `step` |
| `rental_partner_application_submitted` | `business_id?`, `partner_id`, `import_method`, `pms_name?`, `link_public_business` |

Server also writes `rental_referral_clicks` on `/api/stays/go/[propertyId]`.
