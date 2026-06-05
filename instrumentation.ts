/**
 * Server instrumentation hook. PostHog AI OTEL span export is not wired here —
 * `@posthog/ai/otel` is not published in @posthog/ai@7.x. Ask LLM telemetry uses
 * AI SDK `experimental_telemetry` in `lib/ask/askEngine.ts`.
 */
export async function register() {
  // Reserved for future Node-only observability setup.
}
