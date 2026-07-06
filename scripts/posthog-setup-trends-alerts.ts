/**
 * Provision PostHog trend insights and threshold alerts for WhereTo30A.
 *
 * Requires a personal API key (not the project ingest key):
 *   POSTHOG_PERSONAL_API_KEY — Settings → Personal API keys (scopes: insight:write, alert:write)
 *
 * Optional env:
 *   POSTHOG_PROJECT_ID        — default 455090
 *   POSTHOG_HOST                — default https://us.posthog.com
 *   POSTHOG_DASHBOARD_ID        — default 1673843 (wizard dashboard)
 *   POSTHOG_SUBSCRIBED_USER_ID  — numeric user id for alert notifications (required for alerts)
 *
 * Usage:
 *   npx tsx scripts/posthog-setup-trends-alerts.ts --dry-run
 *   npx tsx scripts/posthog-setup-trends-alerts.ts
 *   npx tsx scripts/posthog-setup-trends-alerts.ts --alerts-only
 *   npx tsx scripts/posthog-setup-trends-alerts.ts --insights-only
 */

import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? "455090";
const HOST = (process.env.POSTHOG_HOST ?? "https://us.posthog.com").replace(/\/$/, "");
const DASHBOARD_ID = Number(process.env.POSTHOG_DASHBOARD_ID ?? "1673843");
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const SUBSCRIBED_USER_ID = process.env.POSTHOG_SUBSCRIBED_USER_ID
  ? Number(process.env.POSTHOG_SUBSCRIBED_USER_ID)
  : null;

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const INSIGHTS_ONLY = args.has("--insights-only");
const ALERTS_ONLY = args.has("--alerts-only");

type TrendSeries = {
  event: string;
  name?: string;
  math?: string;
  properties?: Array<{
    key: string;
    value: string | string[];
    operator: string;
    type: string;
  }>;
};

type TrendDef = {
  slug: string;
  name: string;
  description: string;
  series: TrendSeries[];
  interval?: "hour" | "day" | "week";
  dateFrom?: string;
  breakdown?: string;
  tags?: string[];
};

type AlertDef = {
  slug: string;
  insightSlug: string;
  name: string;
  condition: "absolute_value" | "relative_increase" | "relative_decrease";
  moreThan?: number;
  lessThan?: number;
  interval: "hourly" | "daily" | "weekly";
  seriesIndex?: number;
};

const TRENDS: TrendDef[] = [
  {
    slug: "discover-tag-unresolved",
    name: "Discover: unresolved search tags",
    description: "New or unmatched NL discover terms (feeds /admin/discover-gaps).",
    series: [{ event: "discover_tag_unresolved", name: "Unresolved tags" }],
    interval: "day",
    tags: ["discover", "operator"],
  },
  {
    slug: "discover-low-results",
    name: "Discover: low result filters",
    description:
      "Active filter sets with thin results: ≤3 for one town, ≤5 for all towns or 2+ towns. Break down by filter_key.",
    series: [{ event: "discover_low_results", name: "Low result searches" }],
    interval: "day",
    breakdown: "filter_key",
    tags: ["discover", "operator"],
  },
  {
    slug: "discover-nl-parsed",
    name: "Discover NL: parse volume",
    description: "NL query parses; filter used_llm in PostHog UI for LLM vs deterministic.",
    series: [{ event: "discover_nl_parsed", name: "Parses" }],
    interval: "day",
    tags: ["discover"],
  },
  {
    slug: "discover-nl-llm",
    name: "Discover NL: LLM fallback rate",
    description: "Parses that used the LLM resolver (property used_llm = true).",
    series: [
      {
        event: "discover_nl_parsed",
        name: "LLM parses",
        properties: [
          { key: "used_llm", value: "true", operator: "exact", type: "event" },
        ],
      },
    ],
    interval: "day",
    tags: ["discover"],
  },
  {
    slug: "not-found-404",
    name: "404 not found hits",
    description: "Global 404 page renders — broken links or bad inbound URLs.",
    series: [{ event: "not_found", name: "404 hits" }],
    interval: "day",
    tags: ["health"],
  },
  {
    slug: "auth-failures",
    name: "Auth failures (sign-in + sign-up)",
    description: "Failed login and signup attempts.",
    series: [
      { event: "user_sign_in_failed", name: "Sign-in failed" },
      { event: "user_sign_up_failed", name: "Sign-up failed" },
    ],
    interval: "day",
    tags: ["auth", "health"],
  },
  {
    slug: "operator-leads",
    name: "Operator leads (listing + claim)",
    description: "Server-confirmed listing requests and business claims.",
    series: [
      { event: "listing_request_received", name: "Listing requests" },
      { event: "business_claim_received", name: "Business claims" },
    ],
    interval: "day",
    tags: ["operator"],
  },
  {
    slug: "llm-generations",
    name: "AI generations ($ai_generation)",
    description: "Ask assistant LLM call volume (PostHog AI Observability).",
    series: [{ event: "$ai_generation", name: "Generations" }],
    interval: "day",
    tags: ["ask", "llm"],
  },
  {
    slug: "business-feedback",
    name: "Business feedback submissions",
    description: "User-submitted listing corrections and feedback.",
    series: [{ event: "business_feedback_submitted", name: "Feedback" }],
    interval: "week",
    tags: ["operator"],
  },
];

const ALERTS: AlertDef[] = [
  {
    slug: "alert-discover-tag-unresolved",
    insightSlug: "discover-tag-unresolved",
    name: "Discover: new unresolved search tag",
    condition: "absolute_value",
    moreThan: 0,
    interval: "daily",
  },
  {
    slug: "alert-discover-low-results",
    insightSlug: "discover-low-results",
    name: "Discover: filter returned thin results",
    condition: "absolute_value",
    moreThan: 0,
    interval: "daily",
  },
  {
    slug: "alert-not-found-spike",
    insightSlug: "not-found-404",
    name: "404 spike (>10/day)",
    condition: "absolute_value",
    moreThan: 10,
    interval: "daily",
  },
  {
    slug: "alert-auth-failures",
    insightSlug: "auth-failures",
    name: "Auth failures (>5/day)",
    condition: "absolute_value",
    moreThan: 5,
    interval: "daily",
  },
  {
    slug: "alert-operator-listing",
    insightSlug: "operator-leads",
    name: "New operator lead (listing or claim)",
    condition: "absolute_value",
    moreThan: 0,
    interval: "daily",
    seriesIndex: 0,
  },
  {
    slug: "alert-ask-drop",
    insightSlug: "ask-query-volume",
    name: "Ask volume drop (>50% vs prior week)",
    condition: "relative_decrease",
    moreThan: 50,
    interval: "weekly",
  },
];

/** Wizard insight — link alert without creating a duplicate trend. */
const EXISTING_INSIGHTS: Record<string, { name: string; shortId: string }> = {
  "ask-query-volume": {
    name: "Ask query volume",
    shortId: "MU1NzUK9",
  },
};

function buildTrendQuery(def: TrendDef) {
  return {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: def.series.map((s) => ({
        kind: "EventsNode",
        event: s.event,
        name: s.name ?? s.event,
        math: s.math ?? "total",
        ...(s.properties ? { properties: s.properties } : {}),
      })),
      dateRange: { date_from: def.dateFrom ?? "-30d" },
      interval: def.interval ?? "day",
      ...(def.breakdown
        ? { breakdownFilter: { breakdown: def.breakdown, breakdown_type: "event" } }
        : {}),
    },
  };
}

function buildAlertBody(def: AlertDef, insightId: number) {
  const configuration: Record<string, number> = {};
  if (def.moreThan !== undefined) configuration.more_than = def.moreThan;
  if (def.lessThan !== undefined) configuration.less_than = def.lessThan;

  return {
    name: def.name,
    insight: insightId,
    enabled: true,
    condition: { type: def.condition },
    threshold: { configuration },
    calculation_interval: def.interval,
    config: {
      type: "TrendsAlertConfig",
      series_index: def.seriesIndex ?? 0,
    },
    ...(SUBSCRIBED_USER_ID ? { subscribed_users: [SUBSCRIBED_USER_ID] } : {}),
  };
}

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${HOST}${path}`;
  if (DRY_RUN) {
    console.log(`[dry-run] ${method} ${url}`);
    if (body) console.log(JSON.stringify(body, null, 2));
    return {} as T;
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return data as T;
}

type InsightRow = { id: number; name: string; short_id: string; tags?: string[] };

async function listInsights(): Promise<InsightRow[]> {
  const rows: InsightRow[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await api<{ results: InsightRow[]; next: string | null }>(
      "GET",
      `/api/projects/${PROJECT_ID}/insights/?limit=${limit}&offset=${offset}&saved=true`,
    );
    if (DRY_RUN) return [];
    rows.push(...(data.results ?? []));
    if (!data.next) break;
    offset += limit;
  }
  return rows;
}

async function listAlerts(): Promise<Array<{ id: string; name: string; insight: number }>> {
  const data = await api<{ results: Array<{ id: string; name: string; insight: number }> }>(
    "GET",
    `/api/projects/${PROJECT_ID}/alerts/?limit=200`,
  );
  return DRY_RUN ? [] : (data.results ?? []);
}

function findInsightBySlug(insights: InsightRow[], slug: string, def?: TrendDef): InsightRow | undefined {
  const tag = `w30a:${slug}`;
  const byTag = insights.find((i) => i.tags?.includes(tag));
  if (byTag) return byTag;
  if (def) {
    return insights.find((i) => i.name === def.name);
  }
  const existing = EXISTING_INSIGHTS[slug];
  if (existing) {
    return insights.find((i) => i.short_id === existing.shortId || i.name === existing.name);
  }
  return undefined;
}

async function createInsight(def: TrendDef): Promise<number | null> {
  const body = {
    name: def.name,
    description: def.description,
    query: buildTrendQuery(def),
    saved: true,
    tags: [...(def.tags ?? []), `w30a:${def.slug}`],
    dashboards: [DASHBOARD_ID],
  };

  const created = await api<InsightRow>("POST", `/api/projects/${PROJECT_ID}/insights/`, body);
  if (DRY_RUN) {
    console.log(`  would create insight: ${def.name}`);
    return null;
  }
  console.log(`  created insight #${created.id} (${created.short_id}): ${def.name}`);
  return created.id;
}

async function createAlert(def: AlertDef, insightId: number): Promise<void> {
  const body = buildAlertBody(def, insightId);
  if (!SUBSCRIBED_USER_ID) {
    console.warn(`  skip alert "${def.name}" — set POSTHOG_SUBSCRIBED_USER_ID for notifications`);
    return;
  }
  const created = await api<{ id: string; name: string }>(
    "POST",
    `/api/projects/${PROJECT_ID}/alerts/`,
    body,
  );
  if (DRY_RUN) {
    console.log(`  would create alert: ${def.name}`);
    return;
  }
  console.log(`  created alert ${created.id}: ${def.name}`);
}

async function main() {
  if (!API_KEY) {
    console.error("Missing POSTHOG_PERSONAL_API_KEY. Create one at PostHog → Settings → Personal API keys.");
    console.error("Required scopes: insight:read, insight:write, alert:read, alert:write");
    process.exit(1);
  }

  console.log(`PostHog trends & alerts — project ${PROJECT_ID} @ ${HOST}`);
  if (DRY_RUN) console.log("(dry-run — no API writes)\n");

  const insightIds = new Map<string, number>();
  const existingInsights = await listInsights();
  const existingAlerts = ALERTS_ONLY ? await listAlerts() : [];

  if (!ALERTS_ONLY) {
    console.log("\nTrends:");
    for (const def of TRENDS) {
      const found = findInsightBySlug(existingInsights, def.slug, def);
      if (found) {
        console.log(`  exists: ${found.name} (#${found.id}, ${found.short_id})`);
        insightIds.set(def.slug, found.id);
        continue;
      }
      const id = await createInsight(def);
      if (id) insightIds.set(def.slug, id);
    }
  } else {
    for (const def of TRENDS) {
      const found = findInsightBySlug(existingInsights, def.slug, def);
      if (found) insightIds.set(def.slug, found.id);
    }
  }

  if (!INSIGHTS_ONLY) {
    console.log("\nAlerts:");
    if (!SUBSCRIBED_USER_ID && !DRY_RUN) {
      console.warn("  POSTHOG_SUBSCRIBED_USER_ID not set — alerts will be skipped.");
      console.warn("  Find your user id: GET /api/projects/{id}/members/ or your profile URL.");
    }

    const refreshedInsights = ALERTS_ONLY ? existingInsights : await listInsights();
    const alerts = ALERTS_ONLY ? existingAlerts : await listAlerts();
    const alertNames = new Set(alerts.map((a) => a.name));

    for (const def of ALERTS) {
      if (alertNames.has(def.name)) {
        console.log(`  exists: ${def.name}`);
        continue;
      }

      let insightId = insightIds.get(def.insightSlug);
      if (!insightId) {
        const trendDef = TRENDS.find((t) => t.slug === def.insightSlug);
        const found = findInsightBySlug(refreshedInsights, def.insightSlug, trendDef);
        if (found) insightId = found.id;
      }

      if (!insightId) {
        console.warn(`  skip "${def.name}" — insight slug "${def.insightSlug}" not found`);
        continue;
      }

      await createAlert(def, insightId);
    }
  }

  console.log("\nDone.");
  console.log(`Dashboard: ${HOST}/project/${PROJECT_ID}/dashboard/${DASHBOARD_ID}`);
  console.log("Manual steps: connect Slack in PostHog alert settings if you want channel notifications.");
  console.log("See docs/posthog-trends-alerts.md for the full catalog and UI fallback.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
