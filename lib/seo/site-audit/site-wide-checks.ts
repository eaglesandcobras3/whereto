import { parsePageHtml } from "./parse-page-html";
import type { AuditIssue } from "./types";

function collectJsonLdObjects(blocks: string[]): unknown[] {
  const out: unknown[] = [];
  for (const block of blocks) {
    try {
      out.push(JSON.parse(block));
    } catch {
      // invalid handled elsewhere
    }
  }
  return out;
}

function walkJsonLd(node: unknown, visit: (obj: Record<string, unknown>) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLd(item, visit);
    return;
  }
  const obj = node as Record<string, unknown>;
  visit(obj);
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") walkJsonLd(value, visit);
  }
}

/** Checks on the home page JSON-LD and other site-wide signals from a single fetch. */
export function analyzeHomePageJsonLd(homeUrl: string, html: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const parsed = parsePageHtml(html, homeUrl);
  const objects = collectJsonLdObjects(parsed.jsonLdBlocks);

  let hasOrganization = false;
  let hasWebSite = false;

  for (const root of objects) {
    walkJsonLd(root, (obj) => {
      const t = obj["@type"];
      const types = Array.isArray(t) ? t : t ? [t] : [];
      if (types.includes("Organization")) hasOrganization = true;
      if (types.includes("WebSite")) {
        hasWebSite = true;
        const action = obj.potentialAction as Record<string, unknown> | undefined;
        if (action?.["@type"] === "SearchAction") {
          const target = action.target as Record<string, unknown> | { urlTemplate?: string } | undefined;
          const template =
            typeof target === "object" && target && "urlTemplate" in target
              ? String(target.urlTemplate ?? "")
              : "";
          if (template.includes("/ask")) {
            issues.push({
              severity: "warning",
              category: "structured_data",
              rule: "search_action_noindex_target",
              url: homeUrl,
              detail: "WebSite SearchAction points at /ask (noindex + robots-disallowed); use /search or remove",
            });
          }
        }
      }
    });
  }

  if (!hasOrganization) {
    issues.push({
      severity: "warning",
      category: "structured_data",
      rule: "site_organization_schema_missing",
      url: homeUrl,
      detail: "Home page missing Organization JSON-LD",
    });
  }
  if (!hasWebSite) {
    issues.push({
      severity: "warning",
      category: "structured_data",
      rule: "site_website_schema_missing",
      url: homeUrl,
      detail: "Home page missing WebSite JSON-LD",
    });
  }

  return issues;
}
