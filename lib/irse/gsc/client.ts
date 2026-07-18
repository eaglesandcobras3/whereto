import type { SupabaseClient } from "@supabase/supabase-js";
import { GSC_INSPECTION_TTL_MS } from "../weights";
import type { GscStatus } from "../types";
import { getGscConfig } from "./config";
import { mapCoverageToIndexed } from "./map-coverage";

export type InspectOptions = {
  /** Force a live Google API call even if cache is fresh. */
  force?: boolean;
  /** Override TTL ms (default 7 days). */
  ttlMs?: number;
};

type CachedRow = {
  url: string;
  indexed: boolean | null;
  coverage_state: string | null;
  raw: unknown;
  inspected_at: string;
};

/**
 * Inspect a fully-qualified URL via Search Console URL Inspection API,
 * with DB cache (default 7 days).
 */
export async function inspectUrl(
  supabase: SupabaseClient,
  inspectionUrl: string,
  options: InspectOptions = {},
): Promise<GscStatus & { fromCache: boolean; error?: string }> {
  const ttl = options.ttlMs ?? GSC_INSPECTION_TTL_MS;
  const url = inspectionUrl.trim();

  if (!options.force) {
    const cached = await readCache(supabase, url);
    if (cached && Date.now() - new Date(cached.inspected_at).getTime() < ttl) {
      return {
        indexed: cached.indexed,
        coverageState: cached.coverage_state ?? undefined,
        inspectedAt: cached.inspected_at,
        fromCache: true,
      };
    }
  }

  const config = getGscConfig();
  if (!config) {
    return {
      indexed: null,
      fromCache: false,
      error: "GSC is not configured (GSC_SITE_URL / service account env vars).",
    };
  }

  try {
    const raw = await callUrlInspectionApi(config.siteUrl, url, config.clientEmail, config.privateKey);
    const indexStatus = raw.inspectionResult?.indexStatusResult;
    const coverageState = indexStatus?.coverageState ?? null;
    const indexingState = indexStatus?.indexingState ?? null;
    const verdict = mapCoverageToIndexed(coverageState, indexingState);
    const inspectedAt = new Date().toISOString();

    await supabase.from("gsc_url_inspections").upsert(
      {
        url,
        indexed: verdict.indexed,
        coverage_state: verdict.coverageState,
        raw,
        inspected_at: inspectedAt,
      },
      { onConflict: "url" },
    );

    return {
      indexed: verdict.indexed,
      coverageState: verdict.coverageState ?? undefined,
      inspectedAt,
      fromCache: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { indexed: null, fromCache: false, error: message };
  }
}

async function readCache(supabase: SupabaseClient, url: string): Promise<CachedRow | null> {
  const { data, error } = await supabase
    .from("gsc_url_inspections")
    .select("url, indexed, coverage_state, raw, inspected_at")
    .eq("url", url)
    .maybeSingle();
  if (error || !data) return null;
  return data as CachedRow;
}

type InspectionApiResponse = {
  inspectionResult?: {
    indexStatusResult?: {
      coverageState?: string;
      indexingState?: string;
      verdict?: string;
    };
  };
};

async function callUrlInspectionApi(
  siteUrl: string,
  inspectionUrl: string,
  clientEmail: string,
  privateKey: string,
): Promise<InspectionApiResponse> {
  // Dynamic import keeps unit tests light when googleapis is unused.
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const res = await searchconsole.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl,
      siteUrl,
    },
  });
  return (res.data ?? {}) as InspectionApiResponse;
}
