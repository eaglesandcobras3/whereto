import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteAuditReport } from "./types";

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

/** Persist markdown reports only when explicitly enabled (off by default — use CLI for local reports). */
export function shouldStoreAuditReports(): boolean {
  const v = process.env.SEO_AUDIT_STORE_REPORTS?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function isSeoAuditStorageAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) && shouldStoreAuditReports();
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
      summary: {
        ...input.report.summary,
        businessIndexability: input.report.businessIndexability,
      },
      report_markdown: input.markdown,
    })
    .eq("id", runId);

  if (runErr) {
    console.error("[seo-audit] complete run", runErr);
    return false;
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

/** Delete runs older than the newest `keep` (issues table unused — markdown only). */
export async function pruneOldAuditRuns(supabase: SupabaseClient, keep = 6): Promise<void> {
  const runs = await listAuditRuns(supabase, keep + 1);
  const toDelete = runs.slice(keep);
  if (toDelete.length === 0) return;
  const ids = toDelete.map((r) => r.id);
  await supabase.from("seo_audit_runs").delete().in("id", ids);
}
