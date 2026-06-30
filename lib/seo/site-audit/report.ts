import type { AuditCategory, AuditIssue, AuditSeverity, AuditSummary, SiteAuditReport } from "./types";

function countBy<T extends string>(items: T[]): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const item of items) {
    out[item] = (out[item] ?? 0) + 1;
  }
  return out;
}

export function buildAuditSummary(
  issues: AuditIssue[],
  stats: {
    urlsDiscovered: number;
    urlsCrawled: number;
    urlsFailed: number;
    durationMs: number;
  },
): AuditSummary {
  const severities = issues.map((i) => i.severity);
  const categories = issues.map((i) => i.category);
  const ruleCounts = new Map<string, number>();
  for (const issue of issues) {
    ruleCounts.set(issue.rule, (ruleCounts.get(issue.rule) ?? 0) + 1);
  }

  const topRules = [...ruleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([rule, count]) => ({ rule, count }));

  return {
    urlsDiscovered: stats.urlsDiscovered,
    urlsCrawled: stats.urlsCrawled,
    urlsFailed: stats.urlsFailed,
    issueCounts: countBy<AuditSeverity>(severities),
    categoryCounts: countBy<AuditCategory>(categories),
    topRules,
    durationMs: stats.durationMs,
  };
}

export function renderAuditMarkdown(report: SiteAuditReport): string {
  const lines: string[] = [];
  const s = report.summary;

  lines.push("# SEO site audit report");
  lines.push("");
  lines.push(`- **Site:** ${report.baseUrl}`);
  lines.push(`- **Started:** ${report.startedAt}`);
  lines.push(`- **Completed:** ${report.completedAt}`);
  lines.push(`- **URLs crawled:** ${s.urlsCrawled} / ${s.urlsDiscovered} discovered`);
  lines.push(`- **Failed fetches:** ${s.urlsFailed}`);
  lines.push(`- **Duration:** ${(s.durationMs / 1000).toFixed(1)}s`);
  if (report.businessIndexability) {
    const { indexReady, total } = report.businessIndexability;
    const pct = total > 0 ? Math.round((indexReady / total) * 100) : 0;
    lines.push(`- **Business listings index-ready:** ${indexReady}/${total} (${pct}%)`);
  }
  lines.push("");

  lines.push("## Issue summary");
  lines.push("");
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|------:|`);
  lines.push(`| Error | ${s.issueCounts.error ?? 0} |`);
  lines.push(`| Warning | ${s.issueCounts.warning ?? 0} |`);
  lines.push(`| Notice | ${s.issueCounts.notice ?? 0} |`);
  lines.push("");

  lines.push("## By category");
  lines.push("");
  for (const [cat, count] of Object.entries(s.categoryCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${cat}:** ${count}`);
  }
  lines.push("");

  if (s.topRules.length > 0) {
    lines.push("## Top rules");
    lines.push("");
    lines.push(`| Rule | Count |`);
    lines.push(`|------|------:|`);
    for (const { rule, count } of s.topRules) {
      lines.push(`| \`${rule}\` | ${count} |`);
    }
    lines.push("");
  }

  const sections: AuditSeverity[] = ["error", "warning", "notice"];
  for (const severity of sections) {
    const group = report.issues.filter((i) => i.severity === severity);
    if (group.length === 0) continue;
    lines.push(`## ${severity.charAt(0).toUpperCase()}${severity.slice(1)}s (${group.length})`);
    lines.push("");
    const byRule = new Map<string, AuditIssue[]>();
    for (const issue of group) {
      const arr = byRule.get(issue.rule) ?? [];
      arr.push(issue);
      byRule.set(issue.rule, arr);
    }
    for (const [rule, items] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`### \`${rule}\` (${items.length})`);
      lines.push("");
      for (const issue of items.slice(0, 25)) {
        const urlPart = issue.url ? ` — ${issue.url}` : "";
        lines.push(`- ${issue.detail}${urlPart}`);
      }
      if (items.length > 25) {
        lines.push(`- … and ${items.length - 25} more`);
      }
      lines.push("");
    }
  }

  lines.push("## Coverage");
  lines.push("");
  lines.push(`- Sitemap URLs: ${report.sitemapUrls.length}`);
  lines.push(`- Seed URLs: ${report.seedUrls.length}`);
  lines.push(`- Crawled URLs: ${report.crawledUrls.length}`);
  lines.push("");

  return lines.join("\n");
}
