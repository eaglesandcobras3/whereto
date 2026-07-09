import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (key) {
  posthog.init(key, {
    api_host: "/ingest",
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    // Track soft navigations (static/ISR pages) via History API — manual
    // usePathname pageviews in root layout miss many App Router transitions.
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
