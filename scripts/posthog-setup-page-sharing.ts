/**
 * Provision a PostHog dashboard for page sharing analytics.
 *
 * Requires a personal API key (not the project ingest key):
 *   POSTHOG_PERSONAL_API_KEY — Settings → Personal API keys (scopes: insight:write, dashboard:write)
 *
 * Optional env:
 *   POSTHOG_PROJECT_ID — default 455090
 *   POSTHOG_HOST         — default https://us.posthog.com
 *
 * Usage:
 *   npx tsx scripts/posthog-setup-page-sharing.ts --dry-run
 *   npx tsx scripts/posthog-setup-page-sharing.ts
 */

import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? "455090";
const HOST = (process.env.POSTHOG_HOST ?? "https://us.posthog.com").replace(/\/$/, "");
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

const DASHBOARD_NAME = "Page sharing";
const DASHBOARD_TAG = "w30a:page-sharing-dashboard";

type TrendSeries = {
  event: string;
  name?: string;
  math?: string;
};

type InsightDef = {
  slug: string;
  name: string;
  description: string;
  series: TrendSeries[];
  breakdown?: string;
  interval?: "day" | "week";
  /** Formulas need series letters A, B, … */
  formula?: string;
};

const INSIGHTS: InsightDef[] = [
  {
    slug: "share-button-clicks",
    name: "Share button clicks",
    description: "Total share_button_clicked events (open intent).",
    series: [{ event: "share_button_clicked", name: "Share clicks" }],
    interval: "day",
  },
  {
    slug: "share-completed",
    name: "Completed shares",
    description: "Total share_completed events (native, copy, or email).",
    series: [{ event: "share_completed", name: "Shares completed" }],
    interval: "day",
  },
  {
    slug: "share-completion-rate",
    name: "Share completion rate",
    description:
      "Completed shares / share button clicks (formula B/A). Compare open intent vs completed actions.",
    series: [
      { event: "share_button_clicked", name: "Clicks" },
      { event: "share_completed", name: "Completed" },
    ],
    formula: "B/A",
    interval: "day",
  },
  {
    slug: "shares-by-page-type",
    name: "Shares by page type",
    description: "Completed shares broken down by page_type.",
    series: [{ event: "share_completed", name: "Shares" }],
    breakdown: "page_type",
    interval: "week",
  },
  {
    slug: "shares-by-page",
    name: "Shares by individual page",
    description: "Completed shares broken down by page_slug.",
    series: [{ event: "share_completed", name: "Shares" }],
    breakdown: "page_slug",
    interval: "week",
  },
  {
    slug: "shares-by-method",
    name: "Shares by sharing method",
    description: "Completed shares broken down by share_method (native, copy_link, email).",
    series: [{ event: "share_completed", name: "Shares" }],
    breakdown: "share_method",
    interval: "week",
  },
  {
    slug: "most-shared-businesses",
    name: "Most-shared businesses",
    description: "Completed shares where page_type = business, by page_title.",
    series: [
      {
        event: "share_completed",
        name: "Business shares",
        math: "total",
      },
    ],
    breakdown: "page_title",
    interval: "week",
  },
  {
    slug: "most-shared-guides",
    name: "Most-shared guides",
    description: "Completed shares where page_type = guide, by page_title.",
    series: [{ event: "share_completed", name: "Guide shares" }],
    breakdown: "page_title",
    interval: "week",
  },
  {
    slug: "most-shared-towns",
    name: "Most-shared towns",
    description: "Completed shares where page_type = town, by page_title.",
    series: [{ event: "share_completed", name: "Town shares" }],
    breakdown: "page_title",
    interval: "week",
  },
  {
    slug: "most-shared-areas",
    name: "Most-shared areas",
    description: "Completed shares where page_type = area, by page_title.",
    series: [{ event: "share_completed", name: "Area shares" }],
    breakdown: "page_title",
    interval: "week",
  },
];

const PAGE_TYPE_FILTER: Record<string, string> = {
  "most-shared-businesses": "business",
  "most-shared-guides": "guide",
  "most-shared-towns": "town",
  "most-shared-areas": "area",
};

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
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
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

type InsightRow = { id: number; name: string; short_id: string; tags?: string[] };
type DashboardRow = { id: number; name: string; tags?: string[] };

function buildTrendQuery(def: InsightDef) {
  const pageType = PAGE_TYPE_FILTER[def.slug];
  return {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: def.series.map((s) => ({
        kind: "EventsNode",
        event: s.event,
        name: s.name ?? s.event,
        math: s.math ?? "total",
        ...(pageType
          ? {
              properties: [
                {
                  key: "page_type",
                  value: pageType,
                  operator: "exact",
                  type: "event",
                },
              ],
            }
          : {}),
      })),
      dateRange: { date_from: "-30d" },
      interval: def.interval ?? "day",
      ...(def.breakdown
        ? { breakdownFilter: { breakdown: def.breakdown, breakdown_type: "event" } }
        : {}),
      ...(def.formula ? { trendsFilter: { display: "ActionsLineGraph", formula: def.formula } } : {}),
    },
  };
}

async function listDashboards(): Promise<DashboardRow[]> {
  const data = await api<{ results: DashboardRow[] }>(
    "GET",
    `/api/projects/${PROJECT_ID}/dashboards/?limit=100`,
  );
  return DRY_RUN ? [] : (data.results ?? []);
}

async function ensureDashboard(): Promise<number | null> {
  const existing = await listDashboards();
  const found =
    existing.find((d) => d.tags?.includes(DASHBOARD_TAG)) ??
    existing.find((d) => d.name === DASHBOARD_NAME);
  if (found) {
    console.log(`Dashboard exists: ${found.name} (#${found.id})`);
    return found.id;
  }

  const created = await api<DashboardRow>("POST", `/api/projects/${PROJECT_ID}/dashboards/`, {
    name: DASHBOARD_NAME,
    description:
      "Page share funnel: button clicks, completions, completion rate, and breakdowns by type/page/method.",
    tags: [DASHBOARD_TAG, "w30a:share"],
  });
  if (DRY_RUN) {
    console.log(`Would create dashboard: ${DASHBOARD_NAME}`);
    return null;
  }
  console.log(`Created dashboard #${created.id}: ${created.name}`);
  return created.id;
}

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

async function ensureInsight(def: InsightDef, dashboardId: number | null): Promise<void> {
  const tag = `w30a:${def.slug}`;
  const insights = await listInsights();
  const found = insights.find((i) => i.tags?.includes(tag)) ?? insights.find((i) => i.name === def.name);
  if (found) {
    console.log(`  exists: ${found.name} (#${found.id})`);
    return;
  }

  const body = {
    name: def.name,
    description: def.description,
    query: buildTrendQuery(def),
    saved: true,
    tags: ["w30a:share", tag],
    ...(dashboardId ? { dashboards: [dashboardId] } : {}),
  };

  const created = await api<InsightRow>("POST", `/api/projects/${PROJECT_ID}/insights/`, body);
  if (DRY_RUN) {
    console.log(`  would create: ${def.name}`);
    return;
  }
  console.log(`  created insight #${created.id} (${created.short_id}): ${def.name}`);
}

async function main() {
  if (!API_KEY) {
    console.error("Missing POSTHOG_PERSONAL_API_KEY.");
    process.exit(1);
  }

  console.log(`PostHog page sharing dashboard — project ${PROJECT_ID} @ ${HOST}`);
  if (DRY_RUN) console.log("(dry-run — no API writes)\n");

  const dashboardId = await ensureDashboard();
  console.log("\nInsights:");
  for (const def of INSIGHTS) {
    await ensureInsight(def, dashboardId);
  }

  console.log("\nDone.");
  if (dashboardId) {
    console.log(`Dashboard: ${HOST}/project/${PROJECT_ID}/dashboard/${dashboardId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
