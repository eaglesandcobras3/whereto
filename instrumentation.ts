export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!apiKey) return;

    const [{ NodeSDK }, { resourceFromAttributes }, { PostHogSpanProcessor }] =
      await Promise.all([
        import("@opentelemetry/sdk-node"),
        import("@opentelemetry/resources"),
        import("@posthog/ai/otel"),
      ]);

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({ "service.name": "whereto30a" }),
      spanProcessors: [
        new PostHogSpanProcessor({
          apiKey,
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        }),
      ],
    });
    sdk.start();
  }
}
