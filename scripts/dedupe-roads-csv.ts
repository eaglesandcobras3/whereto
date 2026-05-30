/**
 * Thorough dedupe of docs/roads.csv before import.
 *
 * Phase 1 — internal CSV clustering (union-find on multi-signal matches).
 * Phase 2 — match survivors against existing Supabase businesses.
 *
 * Usage:
 *   npx tsx scripts/dedupe-roads-csv.ts              # dry-run + reports
 *   npx tsx scripts/dedupe-roads-csv.ts --write-csv  # also write docs/roads-deduped.csv
 */

import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { nameSimilarity } from "../lib/admin/duplicate-detection";
import {
  coreSlug,
  findExistingBusinessMatch,
  normTitle,
  normPhone,
  parseContact,
  stripLocationFromTitle,
  websiteHost,
  type DedupeMatch,
  type ExistingBusiness,
} from "../lib/admin/match-existing-business";

dotenv.config({ path: ".env.local" });

const CSV_PATH = "docs/roads.csv";
const DEDUPED_CSV = "docs/roads-deduped.csv";
const REPORT_PATH = "docs/roads-dedupe-report.md";
const WRITE_CSV = process.argv.includes("--write-csv");

type CsvRow = Record<string, string>;

type InternalMatchReason =
  | "exact_slug"
  | "core_slug_same_town"
  | "exact_norm_title"
  | "name_high_same_town"
  | "core_name"
  | "phone_and_name"
  | "website_and_name"
  | "contained_name"
  | "token_overlap"
  | "source_url_and_name";

type InternalEdge = {
  a: number;
  b: number;
  reason: InternalMatchReason;
  score: number;
};

type Cluster = {
  indices: number[];
  keeperIdx: number;
  edges: InternalEdge[];
  removedReasons: Map<number, string[]>;
};

function parseCsv(text: string): { header: string[]; rows: CsvRow[] } {
  const parsed: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
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
      if (row.some((c) => c.length > 0)) parsed.push(row);
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.length > 0)) parsed.push(row);
  }
  const [header, ...body] = parsed;
  return {
    header,
    rows: body.map((cells) =>
      Object.fromEntries(header.map((h, idx) => [h, cells[idx] ?? ""])),
    ),
  };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function writeCsv(header: string[], rows: CsvRow[], path: string) {
  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((h) => escapeCsvField(row[h] ?? "")).join(",")),
  ];
  writeFileSync(path, lines.join("\n") + "\n");
}

const DIRECTORY_URL_RE =
  /(?:town-center|towncenter|chamber|directory|\/town\/|\.org\/(?:town|business|shop))/i;

function isGenericDirectoryUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return false;
  return DIRECTORY_URL_RE.test(u);
}

function normTown(raw: string): string {
  return raw.trim().toLowerCase().split(";")[0]?.split("/")[0]?.trim() ?? "";
}

function significantTokens(title: string): Set<string> {
  const STOP = new Set([
    "the",
    "and",
    "of",
    "at",
    "by",
    "llc",
    "inc",
    "co",
    "fl",
    "30a",
    "a",
    "an",
    "beach",
  ]);
  return new Set(
    stripLocationFromTitle(title)
      .split(" ")
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function tokenOverlap(a: string, b: string): number {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.min(ta.size, tb.size);
}

function containedName(a: string, b: string): { match: boolean; score: number } {
  const x = stripLocationFromTitle(a);
  const y = stripLocationFromTitle(b);
  if (x.length < 4 || y.length < 4) return { match: false, score: 0 };
  const sim = nameSimilarity(x, y);
  const shorter = x.length <= y.length ? x : y;
  const longer = x.length <= y.length ? y : x;
  const contained =
    shorter.length >= 4 &&
    longer.includes(shorter) &&
    shorter.length / longer.length >= 0.45;
  return { match: contained && sim >= 0.65, score: sim };
}

function enrichmentScore(row: CsvRow): number {
  let s = 0;
  s += (row.markdown_writeup?.length ?? 0) / 500;
  s += (row.qa_document?.length ?? 0) / 200;
  s += (row.search_profile?.length ?? 0) / 100;
  if (row.website?.trim()) s += 3;
  if (row.contact_information?.trim()) s += 2;
  if (row.business_type?.trim()) s += 2;
  try {
    const tags = JSON.parse(row.item_tags || "[]") as unknown;
    if (Array.isArray(tags)) s += tags.length * 0.5;
  } catch {
    /* ignore */
  }
  if (row.price_level?.trim()) s += 1;
  // Prefer shorter, cleaner slugs (no redundant location suffix)
  if (!/-(seaside|grayton|30a|fl|beach|inlet|rosemary|watersound|seagrove)(-|$)/.test(row.slug)) {
    s += 2;
  }
  return s;
}

class UnionFind {
  parent: number[];
  rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra] += 1;
    }
  }
}

function findInternalEdges(rows: CsvRow[]): InternalEdge[] {
  const edges: InternalEdge[] = [];
  const n = rows.length;

  for (let i = 0; i < n; i++) {
    const a = rows[i];
    const aSlug = a.slug.toLowerCase();
    const aCore = coreSlug(aSlug);
    const aTitle = normTitle(a.title);
    const aCoreTitle = stripLocationFromTitle(a.title);
    const aTown = normTown(a.town_or_area);
    const aPhone = normPhone(parseContact(a.contact_information).phone);
    const aHost = websiteHost(a.website);
    const aSource = a.source_url?.trim().toLowerCase() ?? "";

    for (let j = i + 1; j < n; j++) {
      const b = rows[j];
      const bSlug = b.slug.toLowerCase();
      const bCore = coreSlug(bSlug);
      const bTitle = normTitle(b.title);
      const bCoreTitle = stripLocationFromTitle(b.title);
      const bTown = normTown(b.town_or_area);
      const bPhone = normPhone(parseContact(b.contact_information).phone);
      const bHost = websiteHost(b.website);
      const bSource = b.source_url?.trim().toLowerCase() ?? "";
      const sameTown = aTown === bTown && aTown.length > 0;
      const nameSim = nameSimilarity(a.title, b.title);
      const coreNameSim = nameSimilarity(aCoreTitle, bCoreTitle);

      if (aSlug === bSlug) {
        edges.push({ a: i, b: j, reason: "exact_slug", score: 1 });
        continue;
      }

      if (aTitle === bTitle && aTitle.length >= 3) {
        edges.push({ a: i, b: j, reason: "exact_norm_title", score: 0.99 });
        continue;
      }

      if (aCore === bCore && aCore.length >= 4 && sameTown) {
        edges.push({ a: i, b: j, reason: "core_slug_same_town", score: 0.98 });
        continue;
      }

      if (sameTown && coreNameSim >= 0.95) {
        edges.push({ a: i, b: j, reason: "core_name", score: coreNameSim });
        continue;
      }

      if (sameTown && nameSim >= 0.95) {
        edges.push({ a: i, b: j, reason: "name_high_same_town", score: nameSim });
        continue;
      }

      const contained = containedName(a.title, b.title);
      if (sameTown && contained.match && nameSim >= 0.82) {
        edges.push({ a: i, b: j, reason: "contained_name", score: contained.score });
        continue;
      }

      if (sameTown && aPhone && bPhone && aPhone === bPhone && nameSim >= 0.88) {
        edges.push({ a: i, b: j, reason: "phone_and_name", score: nameSim });
        continue;
      }

      if (sameTown && aHost && bHost && aHost === bHost && nameSim >= 0.92) {
        edges.push({ a: i, b: j, reason: "website_and_name", score: nameSim });
        continue;
      }

      if (sameTown && a.category === b.category) {
        const overlap = tokenOverlap(a.title, b.title);
        if (overlap >= 0.9 && nameSim >= 0.82) {
          edges.push({ a: i, b: j, reason: "token_overlap", score: 0.7 + overlap * 0.25 });
          continue;
        }
      }

      if (
        sameTown &&
        aSource &&
        bSource &&
        aSource === bSource &&
        !isGenericDirectoryUrl(aSource) &&
        nameSim >= 0.92
      ) {
        edges.push({ a: i, b: j, reason: "source_url_and_name", score: nameSim });
      }
    }
  }

  return edges;
}

function buildClusters(rows: CsvRow[], edges: InternalEdge[]): Cluster[] {
  const uf = new UnionFind(rows.length);
  const edgesByRoot = new Map<number, InternalEdge[]>();

  for (const edge of edges) {
    uf.union(edge.a, edge.b);
    const root = uf.find(edge.a);
    const list = edgesByRoot.get(root) ?? [];
    list.push(edge);
    edgesByRoot.set(root, list);
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const root = uf.find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const clusters: Cluster[] = [];
  for (const indices of groups.values()) {
    if (indices.length === 1) {
      clusters.push({
        indices,
        keeperIdx: indices[0],
        edges: [],
        removedReasons: new Map(),
      });
      continue;
    }

    const clusterEdges = edges.filter(
      (e) => indices.includes(e.a) && indices.includes(e.b),
    );

    let keeperIdx = indices[0];
    let bestScore = enrichmentScore(rows[keeperIdx]);
    for (const idx of indices) {
      const s = enrichmentScore(rows[idx]);
      if (s > bestScore) {
        bestScore = s;
        keeperIdx = idx;
      }
    }

    const removedReasons = new Map<number, string[]>();
    for (const idx of indices) {
      if (idx === keeperIdx) continue;
      const reasons: string[] = [];
      for (const edge of clusterEdges) {
        if (edge.a !== idx && edge.b !== idx) continue;
        const other = edge.a === idx ? edge.b : edge.a;
        const otherRow = rows[other];
        reasons.push(
          `${edge.reason} (${edge.score.toFixed(2)}) vs ${otherRow.title} [${otherRow.slug}]`,
        );
      }
      removedReasons.set(idx, reasons.length ? reasons : ["cluster_member"]);
    }

    clusters.push({ indices, keeperIdx, edges: clusterEdges, removedReasons });
  }

  return clusters;
}

async function main() {
  const { header, rows } = parseCsv(readFileSync(CSV_PATH, "utf8"));
  console.log(`Loaded ${rows.length} rows from ${CSV_PATH}\n`);

  // --- Phase 1: internal dedupe ---
  console.log("Phase 1: internal CSV clustering…");
  const edges = findInternalEdges(rows);
  const clusters = buildClusters(rows, edges);
  const multiClusters = clusters.filter((c) => c.indices.length > 1);

  const kept: CsvRow[] = [];
  const removed: Array<{ row: CsvRow; keeper: CsvRow; reasons: string[] }> = [];

  for (const cluster of clusters) {
    const keeperRow = rows[cluster.keeperIdx];
    kept.push(keeperRow);
    for (const idx of cluster.indices) {
      if (idx === cluster.keeperIdx) continue;
      removed.push({
        row: rows[idx],
        keeper: keeperRow,
        reasons: cluster.removedReasons.get(idx) ?? ["cluster_member"],
      });
    }
  }

  const internalByReason = new Map<string, number>();
  for (const edge of edges) {
    internalByReason.set(edge.reason, (internalByReason.get(edge.reason) ?? 0) + 1);
  }

  console.log(`  ${edges.length} internal match edges`);
  console.log(`  ${multiClusters.length} multi-row clusters`);
  console.log(`  ${removed.length} rows removed → ${kept.length} kept\n`);

  // --- Phase 2: DB dedupe ---
  console.log("Phase 2: matching against Supabase…");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(
      "id, title, slug, phone, website, is_storefront, is_service_business, business_categories ( slug )",
    )
    .is("archived_at", null);

  if (error) throw error;

  const existing: ExistingBusiness[] = (businesses ?? []).map((b) => {
    const cat = b.business_categories as { slug?: string } | { slug?: string }[] | null;
    const c = Array.isArray(cat) ? cat[0] : cat;
    return {
      id: b.id,
      title: b.title,
      slug: b.slug,
      phone: b.phone,
      website: b.website,
      is_storefront: b.is_storefront,
      is_service_business: b.is_service_business,
      category_slug: c?.slug ?? null,
    };
  });

  const dbDuplicates: Array<{ row: CsvRow; match: DedupeMatch }> = [];
  const dbNew: CsvRow[] = [];

  for (const row of kept) {
    const match = findExistingBusinessMatch(row as unknown as import("@/lib/admin/match-existing-business").DedupeCandidate, existing);
    if (match) dbDuplicates.push({ row, match });
    else dbNew.push(row);
  }

  const dbByReason = new Map<string, number>();
  for (const { match } of dbDuplicates) {
    dbByReason.set(match.reason, (dbByReason.get(match.reason) ?? 0) + 1);
  }

  console.log(`  ${dbDuplicates.length} match existing DB listing`);
  console.log(`  ${dbNew.length} net new\n`);

  // --- Console summary ---
  console.log("--- Internal duplicate reasons ---");
  for (const [reason, count] of [...internalByReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log("\n--- DB duplicate reasons ---");
  for (const [reason, count] of [...dbByReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }

  if (removed.length > 0) {
    console.log("\n--- Sample internal removals ---");
    for (const r of removed.slice(0, 12)) {
      console.log(`  DROP: ${r.row.title} [${r.row.slug}]`);
      console.log(`    → KEEP: ${r.keeper.title} [${r.keeper.slug}]`);
      console.log(`    → ${r.reasons[0]}`);
    }
  }

  if (dbNew.length > 0) {
    console.log("\n--- Net new rows ---");
    for (const row of dbNew) {
      console.log(`  NEW: ${row.title} [${row.slug}] (${row.category})`);
    }
  }

  // --- Write report ---
  const lines = [
    "# roads.csv dedupe report",
    "",
    `Source: \`${CSV_PATH}\``,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Stage | Count |",
    "| --- | --- |",
    `| Original CSV rows | ${rows.length} |`,
    `| Internal duplicates removed | ${removed.length} |`,
    `| **Kept after internal dedupe** | **${kept.length}** |`,
    `| Already in Supabase (duplicate) | ${dbDuplicates.length} |`,
    `| **Net new to import** | **${dbNew.length}** |`,
    "",
    "## Internal match signals (edge counts)",
    "",
    "| Reason | Pairs matched |",
    "| --- | --- |",
    ...[...internalByReason.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([r, c]) => `| ${r} | ${c} |`),
    "",
    `## Internal duplicate clusters (${multiClusters.length})`,
    "",
    "| Removed title | Removed slug | Town | Keeper title | Keeper slug | Primary reason |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const r of removed.sort((a, b) => a.keeper.slug.localeCompare(b.keeper.slug))) {
    lines.push(
      `| ${r.row.title.replace(/\|/g, "\\|")} | ${r.row.slug} | ${r.row.town_or_area.replace(/\|/g, "\\|")} | ${r.keeper.title.replace(/\|/g, "\\|")} | ${r.keeper.slug} | ${r.reasons[0]?.replace(/\|/g, "\\|") ?? ""} |`,
    );
  }

  lines.push(
    "",
    "## DB duplicate match reasons",
    "",
    "| Reason | Count |",
    "| --- | --- |",
    ...[...dbByReason.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([r, c]) => `| ${r} | ${c} |`),
    "",
    "## DB duplicates (CSV row → existing listing)",
    "",
    "| CSV title | CSV slug | Reason | Score | Existing title | Existing slug |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  for (const { row, match } of dbDuplicates.sort((a, b) => b.match.score - a.match.score)) {
    lines.push(
      `| ${row.title.replace(/\|/g, "\\|")} | ${row.slug} | ${match.reason} | ${match.score.toFixed(2)} | ${match.existing.title.replace(/\|/g, "\\|")} | ${match.existing.slug} |`,
    );
  }

  if (dbNew.length > 0) {
    lines.push(
      "",
      "## Net new rows (safe to import)",
      "",
      "| Title | Slug | Town | Category | Business type |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const row of dbNew.sort((a, b) => a.title.localeCompare(b.title))) {
      lines.push(
        `| ${row.title.replace(/\|/g, "\\|")} | ${row.slug} | ${row.town_or_area.replace(/\|/g, "\\|")} | ${row.category.replace(/\|/g, "\\|")} | ${(row.business_type || "").replace(/\|/g, "\\|")} |`,
      );
    }
  }

  // Shared phone / website audit (NOT auto-merged — manual review)
  const phoneGroups = new Map<string, CsvRow[]>();
  const websiteGroups = new Map<string, CsvRow[]>();
  for (const row of kept) {
    const phone = normPhone(parseContact(row.contact_information).phone);
    const host = websiteHost(row.website);
    if (phone) {
      const list = phoneGroups.get(phone) ?? [];
      list.push(row);
      phoneGroups.set(phone, list);
    }
    if (host) {
      const list = websiteGroups.get(host) ?? [];
      list.push(row);
      websiteGroups.set(host, list);
    }
  }

  const sharedPhones = [...phoneGroups.entries()].filter(([, g]) => g.length > 1);
  const sharedWebsites = [...websiteGroups.entries()].filter(([, g]) => g.length > 1);

  lines.push(
    "",
    "## Shared contact audit (kept separate — not auto-merged)",
    "",
    "These groups share a phone or website but were **not** merged because names differ enough to be distinct locations or sub-brands.",
    "",
    `### Shared phones (${sharedPhones.length} groups)`,
    "",
  );
  for (const [phone, group] of sharedPhones.sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
    lines.push(`**${phone}** (${group.length} listings)`);
    for (const row of group) {
      lines.push(`- ${row.title} (\`${row.slug}\`) — ${row.town_or_area}`);
    }
    lines.push("");
  }

  lines.push(`### Shared websites (${sharedWebsites.length} groups)`, "");
  for (const [host, group] of sharedWebsites.sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
    lines.push(`**${host}** (${group.length} listings)`);
    for (const row of group) {
      lines.push(`- ${row.title} (\`${row.slug}\`) — ${row.town_or_area}`);
    }
    lines.push("");
  }

  writeFileSync(REPORT_PATH, lines.join("\n") + "\n");
  console.log(`\nWrote ${REPORT_PATH}`);

  if (WRITE_CSV) {
    writeCsv(header, kept, DEDUPED_CSV);
    console.log(`Wrote ${DEDUPED_CSV} (${kept.length} rows)`);
  } else {
    console.log(`Pass --write-csv to write ${DEDUPED_CSV}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
