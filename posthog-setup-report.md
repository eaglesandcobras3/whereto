<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into WhereTo30A.

## Summary of changes

**New files:**
- `instrumentation-client.ts` — Client-side PostHog initialization using the Next.js 15.3+ recommended approach. Initializes PostHog with `capture_pageview: false` (manual tracking via `PostHogPageView`), error tracking, and the `/ingest` reverse proxy.
- `lib/analytics/posthog-server.ts` — Server-side PostHog client factory (`getPostHogServerClient()`) using `posthog-node`. Reuses existing config helpers so the same env vars work for both client and server.

**Modified files:**
- `components/analytics/PostHogProvider.tsx` — Removed the `useEffect`-based `posthog.init()` call (now handled by `instrumentation-client.ts`). The provider now simply wraps children with `PHProvider` for React context.
- `next.config.ts` — Added PostHog reverse proxy rewrites at `/ingest/*` (routes through Next.js to avoid ad blockers). Added `skipTrailingSlashRedirect: true`. Hosts are derived from `NEXT_PUBLIC_POSTHOG_HOST` env var.
- `.env.local` — Added `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`.

**Event capture added:**
- `app/login/login-form.tsx` — `user_signed_in` on success, `user_sign_in_failed` on error, `posthog.identify()` linking Supabase user ID.
- `app/signup/signup-form.tsx` — `user_signed_up` on success, `user_sign_up_failed` on error, `posthog.identify()` linking Supabase user ID.
- `components/ask/ChatPanel.tsx` — `ask_query_submitted` on every AI assistant query.
- `components/discovery/SaveButton.tsx` — `business_saved` after confirmed save.
- `components/listing-request/ListBusinessForm.tsx` — `listing_request_submitted` on successful form submission.
- `components/feedback/BusinessFeedbackForm.tsx` — `business_feedback_submitted` on successful submission.
- `components/business/ClaimBusinessEmailForm.tsx` — `business_claim_submitted` on successful submission.
- `components/ask/ShareArtifactButton.tsx` — `ask_results_shared` for native share, copy link, and copy summary actions.
- `app/api/saves/route.ts` — `business_save_completed` server-side via `posthog-node` using Supabase user ID as `distinctId`.
- `app/api/listing-requests/route.ts` — `listing_request_received` server-side after email sent, using submitter email as `distinctId`.
- `app/api/business-claim-email/route.ts` — `business_claim_received` server-side after email sent, using submitter email as `distinctId`.

## Events

| Event | Description | File |
|-------|-------------|------|
| `user_signed_in` | User successfully signed in via login form | `app/login/login-form.tsx` |
| `user_sign_in_failed` | User sign-in attempt failed | `app/login/login-form.tsx` |
| `user_signed_up` | User successfully created a new account | `app/signup/signup-form.tsx` |
| `user_sign_up_failed` | User signup attempt failed | `app/signup/signup-form.tsx` |
| `ask_query_submitted` | User submitted a message to the AI Ask assistant | `components/ask/ChatPanel.tsx` |
| `business_saved` | User saved a business (client-side confirm) | `components/discovery/SaveButton.tsx` |
| `listing_request_submitted` | User submitted a new business listing request | `components/listing-request/ListBusinessForm.tsx` |
| `business_feedback_submitted` | User submitted feedback about a listing | `components/feedback/BusinessFeedbackForm.tsx` |
| `business_claim_submitted` | User submitted a business claim/update request | `components/business/ClaimBusinessEmailForm.tsx` |
| `ask_results_shared` | User shared Ask results (native share, copy link, or copy summary) | `components/ask/ShareArtifactButton.tsx` |
| `share_button_clicked` | User clicked Share on a town/area/business/guide page | `components/share/PageShareButton.tsx` |
| `share_completed` | Native share succeeded, link copied, or email share opened | `components/share/PageShareButton.tsx` |
| `share_cancelled` | Native share sheet dismissed without sharing | `components/share/PageShareButton.tsx` |
| `business_save_completed` | Server confirmed business save (critical conversion, server-side) | `app/api/saves/route.ts` |
| `listing_request_received` | Server confirmed listing request email sent | `app/api/listing-requests/route.ts` |
| `business_claim_received` | Server confirmed business claim email sent | `app/api/business-claim-email/route.ts` |

---

## LLM analytics (AI Observability)

PostHog AI Observability is now wired to every OpenAI call made by the Ask assistant via the Vercel AI SDK + OpenTelemetry integration. Each call emits a `$ai_generation` event automatically, capturing model name, input/output tokens, latency, cost, and full prompt/response content.

**New files:**
- `instrumentation.ts` — Server-side Next.js instrumentation hook. Initializes the OpenTelemetry SDK with `PostHogSpanProcessor` on Node.js runtime only. Reads keys from existing `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` env vars.

**New packages:** `@posthog/ai`, `@opentelemetry/sdk-node`, `@opentelemetry/resources`

**LLM call sites instrumented (`experimental_telemetry` added):**

| File | Function | `functionId` | `posthog_distinct_id` |
|------|----------|-------------|----------------------|
| `lib/ask/askEngine.ts` | `generateText` in `runAskTurn` | `ask-generate` | Supabase user ID (when authenticated) |
| `lib/ask/askEngine.ts` | `streamText` in `streamAskTurn` | `ask-stream` | Supabase user ID (when authenticated) |
| `lib/ask/clarifying-questions.ts` | `generateObject` in `decideClarifyingQuestionIds` | `ask-clarify-decide` | — |
| `lib/ask/clarifying-questions.ts` | `generateObject` in `buildClarifyingQuestionsWithReasoning` | `ask-clarify-inspect` | — |
| `lib/ask/openai-validation.ts` | `generateObject` in `validateResultsWithOpenAI` | `ask-validate-results` | — |

View LLM generations and traces in PostHog under [AI Observability → Generations](https://us.posthog.com/project/455090/llm-observability/generations).

---

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/455090/dashboard/1673843)
- [User signups & logins](https://us.posthog.com/project/455090/insights/9UXsrKya)
- [Ask query volume](https://us.posthog.com/project/455090/insights/MU1NzUK9)
- [Business saves](https://us.posthog.com/project/455090/insights/KZZ9Tpv4)
- [Signup to engagement funnel](https://us.posthog.com/project/455090/insights/N2XFeT5x)
- [Operator lead generation](https://us.posthog.com/project/455090/insights/ewHeRyNE)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
