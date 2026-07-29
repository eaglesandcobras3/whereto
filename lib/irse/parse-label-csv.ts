import { readFileSync } from "fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseKindSlugLabel,
  parseLabelRoute,
  type ParsedLabelRoute,
} from "./parse-label-route";
import {
  buildLabelRouteLookup,
  resolveLabelRoute,
  type LabelRouteLookup,
} from "./resolve-label-route";

export type LabeledRoute = ParsedLabelRoute & {
  indexed: boolean;
  /** Original CSV URL/path when resolved via alias/redirect. */
  source?: string;
  via?: string;
};

function parseCsvRows(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  if (rows.length === 0) return [];

  const first = rows[0]!.map((h) => h.trim().toLowerCase());
  const looksLikeHeader = first.some((h) =>
    ["path", "url", "route", "slug", "kind"].includes(h),
  );

  if (looksLikeHeader) {
    const header = first;
    return rows.slice(1).map((cells) =>
      Object.fromEntries(header.map((h, idx) => [h, (cells[idx] ?? "").trim()])),
    );
  }

  return rows.map((cells) => ({ path: (cells[0] ?? "").trim() }));
}

function rowPathish(row: Record<string, string>): string {
  return row.path || row.url || row.route || row.pathname || row.href || "";
}

/**
 * Sync parse only (no DB alias resolution). Prefer {@link loadAndResolveLabeledRoutesFromCsv}.
 */
export function loadLabeledRoutesFromCsv(
  filePath: string,
  indexed: boolean,
): { routes: LabeledRoute[]; warnings: string[] } {
  const text = readFileSync(filePath, "utf8");
  const rows = parseCsvRows(text);
  const routes: LabeledRoute[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const pathish = rowPathish(row);
    const parsed = pathish
      ? parseLabelRoute(pathish)
      : parseKindSlugLabel(row.kind, row.slug);
    if (!parsed) {
      warnings.push(`${filePath} row ${i + 1}: could not parse route`);
      continue;
    }
    const key = `${parsed.kind}:${parsed.slug}`;
    if (seen.has(key)) {
      warnings.push(`${filePath}: duplicate ${key} skipped`);
      continue;
    }
    seen.add(key);
    routes.push({ ...parsed, indexed, source: pathish || undefined });
  }

  return { routes, warnings };
}

/**
 * Load CSV routes and resolve root aliases / redirects using live town/area/category slugs.
 */
export async function loadAndResolveLabeledRoutesFromCsv(
  supabase: SupabaseClient,
  filePath: string,
  indexed: boolean,
  lookup?: LabelRouteLookup,
): Promise<{ routes: LabeledRoute[]; warnings: string[]; resolvedAliases: number }> {
  const text = readFileSync(filePath, "utf8");
  const rows = parseCsvRows(text);
  const maps = lookup ?? (await buildLabelRouteLookup(supabase));
  const routes: LabeledRoute[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let resolvedAliases = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const pathish = rowPathish(row);
    let resolved: { route: ParsedLabelRoute; via?: string } | null = null;

    if (pathish) {
      resolved = resolveLabelRoute(pathish, maps);
    } else {
      const explicit = parseKindSlugLabel(row.kind, row.slug);
      if (explicit) resolved = { route: explicit };
    }

    if (!resolved) {
      const hint = pathish || `${row.kind ?? ""}/${row.slug ?? ""}` || "(empty)";
      warnings.push(`${filePath} row ${i + 1}: could not resolve route ${hint}`);
      continue;
    }

    const { route, via } = resolved;
    const key = `${route.kind}:${route.slug}`;
    if (seen.has(key)) {
      warnings.push(`${filePath}: duplicate ${key} skipped (${hintSource(pathish, via)})`);
      continue;
    }
    seen.add(key);
    if (via) resolvedAliases += 1;
    routes.push({
      ...route,
      indexed,
      source: pathish || undefined,
      via,
    });
  }

  return { routes, warnings, resolvedAliases };
}

function hintSource(pathish: string, via?: string): string {
  if (via) return via;
  return pathish || "explicit kind/slug";
}
