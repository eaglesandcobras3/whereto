# PostHog trends & alerts

WhereTo30A sends product analytics to PostHog project **455090** (`us.posthog.com`). This doc lists the recommended **trend insights** and **threshold alerts**, plus how to provision them.

## Quick links (wizard baseline)

The PostHog wizard already created a starter dashboard:

| Resource | Link |
|----------|------|
| Dashboard | [Analytics basics](https://us.posthog.com/project/455090/dashboard/1673843) |
| User signups & logins | [insight](https://us.posthog.com/project/455090/insights/9UXsrKya) |
| Ask query volume | [insight](https://us.posthog.com/project/455090/insights/MU1NzUK9) |
| Business saves | [insight](https://us.posthog.com/project/455090/insights/KZZ9Tpv4) |
| Signup → engagement funnel | [insight](https://us.posthog.com/project/455090/insights/N2XFeT5x) |
| Operator lead generation | [insight](https://us.posthog.com/project/455090/insights/ewHeRyNE) |
| LLM generations | [AI Observability](https://us.posthog.com/project/455090/llm-observability/generations) |

## Automated setup (recommended)

### 1. Create a personal API key

PostHog → **Settings** → **Personal API keys** → Create key with scopes:

- `insight:read`, `insight:write`
- `alert:read`, `alert:write`

Add to `.env.local` (do **not** commit):

```bash
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_SUBSCRIBED_USER_ID=12345   # your numeric user id (for alert notifications)
```

Optional overrides:

```bash
POSTHOG_PROJECT_ID=455090
POSTHOG_HOST=https://us.posthog.com
POSTHOG_DASHBOARD_ID=1673843
```

Find your user id: open your PostHog profile or run:

```bash
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "https://us.posthog.com/api/projects/455090/members/" | jq '.results[0].user.id'
```

### 2. Run the provisioner

```bash
npm run posthog:setup-trends-alerts -- --dry-run   # preview
npm run posthog:setup-trends-alerts                # create insights + alerts
```

Flags:

- `--insights-only` — trends only, no alerts
- `--alerts-only` — alerts only (insights must already exist)

The script tags created insights with `w30a:<slug>` so re-runs are idempotent.

## Trends to create

| Slug | Event(s) | Why |
|------|----------|-----|
| `discover-tag-unresolved` | `discover_tag_unresolved` | New NL search terms missing from vocabulary → `/admin/discover-gaps` |
| `discover-nl-parsed` | `discover_nl_parsed` | NL parse volume; filter `used_llm`, `deterministic_confidence`, `confused_terms` in UI |
| `discover-nl-llm` | `discover_nl_parsed` where `used_llm = true` | LLM fallback rate |
| `not-found-404` | `not_found` | Broken links / bad inbound URLs |
| `auth-failures` | `user_sign_in_failed`, `user_sign_up_failed` | Auth health |
| `operator-leads` | `listing_request_received`, `business_claim_received` | Server-confirmed operator leads |
| `llm-generations` | `$ai_generation` | Ask assistant LLM volume & cost |
| `business-feedback` | `business_feedback_submitted` | Listing correction volume |

### Manual UI: create a trend

1. PostHog → **Product analytics** → **New insight** (Trends is the default).
2. Add series → pick the event from the table above.
3. Set interval (day/week) and date range.
4. **Save** → add to dashboard **1673843**.
5. For property filters: **+ Filter** → event property (e.g. `used_llm` is `true`).

## Alerts to create

Alerts only work on **Trend** insights. For each alert: open the insight → **Alerts** tab → **New alert**.

| Alert | Insight | Condition | Threshold | Check interval |
|-------|---------|-----------|-----------|----------------|
| Discover: new unresolved search tag | `discover_tag_unresolved` trend | absolute value | more than **0** | daily |
| 404 spike | `not_found` trend | absolute value | more than **10** | daily |
| Auth failures | auth failures trend | absolute value | more than **5** | daily |
| New operator lead | operator leads trend (series 0) | absolute value | more than **0** | daily |
| Ask volume drop | [Ask query volume](https://us.posthog.com/project/455090/insights/MU1NzUK9) | relative decrease | more than **50%** | weekly |

### Notification channels

On each alert:

1. Add **subscribed users** (in-app + email).
2. Optional: connect **Slack** — PostHog → **Data pipelines** → add Slack destination, then pick the channel in the alert form.
3. Optional: **webhook** for PagerDuty or custom routing.

Tune thresholds after a week of baseline traffic.

## Event catalog (instrumented in code)

| Event | Source | Notes |
|-------|--------|-------|
| `$pageview` | `PostHogPageView` | Manual pageviews |
| `user_signed_in` / `user_sign_up_failed` | login/signup forms | Auth |
| `user_signed_up` / `user_sign_up_failed` | signup form | Auth |
| `ask_query_submitted` | `ChatPanel` | Ask usage |
| `business_saved` | `SaveButton` | Client-side save confirm |
| `business_save_completed` | `/api/saves` | Server-side save (authoritative) |
| `listing_request_submitted` | `ListBusinessForm` | Client |
| `listing_request_received` | `/api/listing-requests` | Server |
| `business_claim_submitted` | `ClaimBusinessEmailForm` | Client |
| `business_claim_received` | `/api/business-claim-email` | Server |
| `business_feedback_submitted` | `BusinessFeedbackForm` | Listing feedback |
| `ask_results_shared` | `ShareArtifactButton` | Share actions |
| `discover_nl_parsed` | `track-discover-nl-parse.ts` | NL resolver telemetry |
| `discover_tag_unresolved` | `record-discover-search-gaps.ts` | Vocabulary gaps |
| `not_found` | `PostHogNotFoundCapture` | 404 page |
| `$ai_generation` | `instrumentation.ts` + Ask engine | LLM observability |

## Subscriptions (weekly digests)

For non-urgent reporting, use **Subscriptions** on a dashboard or insight:

1. Open the dashboard → **Subscribe** → **New subscription**.
2. Choose **Email** or **Slack**, frequency **weekly**.
3. Good candidates: the main dashboard (1673843) or the Ask volume insight.

## PostHog MCP (optional)

To manage trends and alerts from Cursor with natural language, add the [PostHog MCP server](https://posthog.com/docs/model-context-protocol) in Cursor settings with a personal API key. Cloud agents in this repo do not have it configured by default.

## Related

- [posthog-setup-report.md](../posthog-setup-report.md) — initial wizard output
- [OPERATOR-TODO.md](OPERATOR-TODO.md) — operator checklist (Discover gaps, feature flags)
