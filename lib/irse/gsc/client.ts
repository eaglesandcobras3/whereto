import { JWT } from "google-auth-library";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GSC_INSPECTION_TTL_MS } from "../weights";
import type { GscStatus } from "../types";
import { getGscConfig } from "./config";
import { mapCoverageToIndexed } from "./map-coverage";

const URL_INSPECTION_ENDPOINT =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

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
 *
 * Uses google-auth-library + REST (not the full googleapis SDK) to keep
 * Next.js TypeScript builds from OOM’ing on CI.
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
  error?: { message?: string; status?: string; code?: number };
};

async function callUrlInspectionApi(
  siteUrl: string,
  inspectionUrl: string,
  clientEmail: string,
  privateKey: string,
): Promise<InspectionApiResponse> {
  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [GSC_SCOPE],
  });
  const accessToken = await auth.getAccessToken();
  const token = typeof accessToken === "string" ? accessToken : accessToken?.token;
  if (!token) {
    throw new Error("Failed to obtain GSC access token from service account.");
  }

  const res = await fetch(URL_INSPECTION_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl,
    }),
  });

  const data = (await res.json()) as InspectionApiResponse;
  if (!res.ok) {
    const detail = data.error?.message ?? res.statusText;
    throw new Error(`GSC URL Inspection failed (${res.status}): ${detail}`);
  }
  return data;
}
