import type { SupabaseClient } from "@supabase/supabase-js";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";

export type SupabaseDiagnosticStep = {
  n: number;
  title: string;
  ok: boolean;
  detail: string;
};

/** Strips pnpm/CLI noise (`--`) and empty input so spot checks are skipped instead of “slug --”. */
export function normalizeOptionalSlug(
  value: string | undefined | null,
): string | undefined {
  if (value == null) return undefined;
  const t = value.trim();
  if (t === "" || t === "--") return undefined;
  return t;
}

function mask(v: string | undefined): string {
  if (!v) return "(missing)";
  if (v.length < 8) return "***";
  return `…${v.slice(-4)}`;
}

export function getSupabaseSecretKeyForDiagnostics(): string {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

/**
 * Step 1 only — no DB call. Same checks for CLI and /dev page.
 */
export function buildSupabaseEnvStep(): SupabaseDiagnosticStep {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = getSupabaseSecretKeyForDiagnostics();

  const lines: string[] = [];
  lines.push(`NEXT_PUBLIC_SUPABASE_URL: ${url || "(missing)"}`);
  lines.push(`Publishable/anon: ${mask(publishable)} — client / middleware.`);
  lines.push(`Service (server routes): ${mask(service)} — must match this Supabase project.`);

  if (!url) {
    return {
      n: 1,
      title: "Environment",
      ok: false,
      detail: lines.join("\n") + "\n\nAdd NEXT_PUBLIC_SUPABASE_URL to .env.local.",
    };
  }
  if (!service) {
    return {
      n: 1,
      title: "Environment",
      ok: false,
      detail:
        lines.join("\n") +
        "\n\nSet SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) for the same project as the URL.",
    };
  }
  return { n: 1, title: "Environment", ok: true, detail: lines.join("\n") };
}

type StepOpts = { townSlug?: string; businessSlug?: string };

/**
 * Steps 2+ — require a service-role client (same PostgREST rules as the app).
 */
export async function runSupabaseDataSteps(
  supabase: SupabaseClient,
  opts: StepOpts = {},
): Promise<SupabaseDiagnosticStep[]> {
  const steps: SupabaseDiagnosticStep[] = [];
  const townSlug = normalizeOptionalSlug(opts.townSlug);
  const businessSlug = normalizeOptionalSlug(opts.businessSlug);

  const { error: probeErr } = await supabase.from("towns").select("id").limit(1);
  steps.push({
    n: 2,
    title: "API + service key",
    ok: !probeErr,
    detail: probeErr
      ? `${probeErr.message}\n\n401/403: wrong key. "relation" / 42P01: run migrations.`
      : "Can read `towns` with the service key.",
  });
  if (probeErr) return steps;

  const { count: townAny, error: e3 } = await supabase
    .from("towns")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  steps.push({
    n: 3,
    title: "Towns: not archived",
    ok: !e3,
    detail: e3 ? e3.message : `Count: ${townAny ?? 0} (any row means data exists).`,
  });
  if (e3) return steps;

  const { count: townVisible, error: e4 } = await supabase
    .from("towns")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("status", "published");
  steps.push({
    n: 4,
    title: "Towns: public visibility",
    ok: !e4 && (townVisible ?? 0) > 0,
    detail: e4
      ? e4.message
      : `Published towns: ${townVisible ?? 0}\n${
          townVisible === 0 && (townAny ?? 0) > 0
            ? "Rows exist but none are published — set status=published for live towns."
            : townVisible === 0
              ? "No town rows; add/restore data in this project."
              : "At least one published town can render at /{slug}."
        }`,
  });

  const { count: bizAny } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  const { count: bizVisible, error: e5 } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);
  steps.push({
    n: 5,
    title: "Businesses: not archived + visible",
    ok: !e5 && (bizAny === 0 || (bizVisible ?? 0) > 0),
    detail: e5
      ? e5.message
      : `Non-archived: ${bizAny ?? 0}. Visible in app: ${bizVisible ?? 0}.${
          bizAny && !bizVisible
            ? "\nRows exist but hidden — same visibility fix as towns."
            : "\nSearch + /business/… use these filters."
        }`,
  });

  const townKey = townSlug != null && townSlug.length > 0 ? normalizeUrlSegment(townSlug) : "";
  if (townKey) {
    const s = townKey;
    const { data: raws, error: te1 } = await supabase
      .from("towns")
      .select("id, title, slug, status, archived_at")
      .eq("slug", s)
      .limit(1);
    const { data: appTowns, error: te2 } = await supabase
      .from("towns")
      .select("id, title, slug")
      .eq("slug", s)
      .is("archived_at", null)
      .eq("status", "published")
      .limit(1);
    const raw = raws?.[0];
    const appTown = appTowns?.[0];
    const lines = [
      `Slug: ${s}`,
      te1
        ? `Error: ${te1.message}`
        : raw
          ? `DB: “${(raw as { title: string }).title}”, status=${
              (raw as { status: string | null }).status
            }`
          : "No `towns` row for this slug.",
      te2 ? `Filter query: ${te2.message}` : "",
      !te2 && appTown?.id
        ? `→ Open: /${s}`
        : raw
          ? "→ 404: fails archived or not published (or duplicate slug rows: dedupe in DB)."
          : "→ 404: use exact slug in DB.",
    ].filter(Boolean);
    steps.push({
      n: 6,
      title: `Spot check: town “${s}”`,
      ok: !te1 && !te2 && Boolean(appTown),
      detail: lines.join("\n"),
    });
  }

  const bizKey =
    businessSlug != null && businessSlug.length > 0
      ? normalizeUrlSegment(businessSlug)
      : "";
  if (bizKey) {
    const s = bizKey;
    const { data: bRaws, error: be1 } = await supabase
      .from("businesses")
      .select("id, title, slug, is_hidden_from_search, archived_at")
      .eq("slug", s)
      .limit(1);
    const { data: bApps, error: be2 } = await supabase
      .from("businesses")
      .select("id, title, slug")
      .eq("slug", s)
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(1);
    const bRaw = bRaws?.[0];
    const bApp = bApps?.[0];
    const blines = [
      `Slug: ${s}`,
      be1
        ? `Error: ${be1.message}`
        : bRaw
          ? `DB: “${(bRaw as { title: string }).title}”, is_hidden_from_search=${
              (bRaw as { is_hidden_from_search: boolean | null }).is_hidden_from_search
            }`
          : "No `businesses` row for this slug.",
      be2 ? `Filter query: ${be2.message}` : "",
      !be2 && bApp?.id
        ? `→ Open: /business/${s}`
        : bRaw
          ? "→ 404: fails visibility (or stricter app checks)."
          : "→ 404: slug may differ in this project.",
    ].filter(Boolean);
    steps.push({
      n: 7,
      title: `Spot check: business “${s}”`,
      ok: !be1 && !be2 && Boolean(bApp),
      detail: blines.join("\n"),
    });
  }

  return steps;
}
