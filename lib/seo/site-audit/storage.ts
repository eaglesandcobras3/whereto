import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditIssue, SiteAuditReport } from "./types";

export type StoredAuditRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  base_url: string;
  urls_crawled: number;
  urls_total: number;
  summary: Record<string, unknown>;
  report_markdown: string | null;
  error_message: string | null;
};

export function isSeoAuditStorageAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
}

export async function createAuditRun(
  supabase: SupabaseClient,
  baseUrl: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("seo_audit_runs")
    .insert({
      base_url: baseUrl,
      status: "running",
      urls_crawled: 0,
      urls_total: 0,
      summary: {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[seo-audit] create run", error);
    return null;
  }
  return data.id as string;
}

export async function completeAuditRun(
  supabase: SupabaseClient,
  runId: string,
  input: {
    report: SiteAuditReport;
    markdown: string;
    status?: "completed" | "partial";
  },
): Promise<boolean> {
  const { error: runErr } = await supabase
    .from("seo_audit_runs")
    .update({
      completed_at: input.report.completedAt,
      status: input.status ?? "completed",
      urls_crawled: input.report.summary.urlsCrawled,
      urls_total: input.report.summary.urlsDiscovered,
      summary: input.report.summary,
      report_markdown: input.markdown,
    })
    .eq("id", runId);

  if (runErr) {
    console.error("[seo-audit] complete run", runErr);
    return false;
  }

  const rows = input.report.issues.map((issue) => issueToRow(runId, issue));
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("seo_audit_issues").insert(chunk);
    if (error) {
      console.error("[seo-audit] insert issues", error);
      return false;
    }
  }

  return true;
}

export async function failAuditRun(
  supabase: SupabaseClient,
  runId: string,
  message: string,
): Promise<void> {
  await supabase
    .from("seo_audit_runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: message,
    })
    .eq("id", runId);
}

function issueToRow(runId: string, issue: AuditIssue) {
  return {
    run_id: runId,
    severity: issue.severity,
    category: issue.category,
    rule: issue.rule,
    url: issue.url ?? null,
    detail: issue.detail,
  };
}

export async function listAuditRuns(
  supabase: SupabaseClient,
  limit = 12,
): Promise<StoredAuditRun[]> {
  const { data, error } = await supabase
    .from("seo_audit_runs")
    .select(
      "id, started_at, completed_at, status, base_url, urls_crawled, urls_total, summary, report_markdown, error_message",
    )
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[seo-audit] list runs", error);
    return [];
  }
  return (data ?? []) as StoredAuditRun[];
}

export async function getAuditRun(
  supabase: SupabaseClient,
  runId: string,
): Promise<StoredAuditRun | null> {
  const { data, error } = await supabase
    .from("seo_audit_runs")
    .select(
      "id, started_at, completed_at, status, base_url, urls_crawled, urls_total, summary, report_markdown, error_message",
    )
    .eq("id", runId)
    .maybeSingle();

  if (error || !data) return null;
  return data as StoredAuditRun;
}

export async function listAuditIssuesForRun(
  supabase: SupabaseClient,
  runId: string,
  severity?: string,
): Promise<AuditIssue[]> {
  let q = supabase
    .from("seo_audit_issues")
    .select("severity, category, rule, url, detail")
    .eq("run_id", runId)
    .order("severity", { ascending: true })
    .limit(500);

  if (severity) q = q.eq("severity", severity);

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((row) => ({
    severity: row.severity as AuditIssue["severity"],
    category: row.category as AuditIssue["category"],
    rule: row.rule as string,
    url: row.url ?? undefined,
    detail: row.detail as string,
  }));
}

export async function pruneOldAuditRuns(supabase: SupabaseClient, keep = 12): Promise<void> {
  const runs = await listAuditRuns(supabase, keep + 1);
  const toDelete = runs.slice(keep);
  if (toDelete.length === 0) return;
  const ids = toDelete.map((r) => r.id);
  await supabase.from("seo_audit_runs").delete().in("id", ids);
}
