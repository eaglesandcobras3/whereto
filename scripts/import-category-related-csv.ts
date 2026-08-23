/**
 * Sync category_related_categories from docs/category-related.csv.
 *
 * Columns: Top Level Category, Subcategory, Related Top Level Category, Related Subcategory
 * Resolves both subcategories via (parent title, leaf title) on business_categories.
 *
 * Replace-sync: upserts all CSV pairs, deletes pairs not in the CSV.
 *
 * Usage:
 *   npx tsx scripts/import-category-related-csv.ts --dry-run
 *   npx tsx scripts/import-category-related-csv.ts
 *   npx tsx scripts/import-category-related-csv.ts --file docs/category-related.csv
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config({ path: ".env.local" });

const DEFAULT_FILE = "docs/category-related.csv";
const PAGE = 1000;

type CsvLink = {
  topLevel: string;
  subcategory: string;
  relatedTopLevel: string;
  relatedSubcategory: string;
};

type LinkRow = { category_id: string; related_category_id: string };

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--file") file = argv[++i] ?? DEFAULT_FILE;
    else if (a.startsWith("--file=")) file = a.slice("--file=".length);
  }
  return { file, dryRun };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
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
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      if (ch === "\r") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseCategoryRelatedCsv(text: string): CsvLink[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const topIdx = header.indexOf("top level category");
  const subIdx = header.indexOf("subcategory");
  const relTopIdx = header.indexOf("related top level category");
  const relSubIdx = header.indexOf("related subcategory");
  if (topIdx < 0 || subIdx < 0 || relTopIdx < 0 || relSubIdx < 0) {
    throw new Error(
      "CSV must have columns: Top Level Category, Subcategory, Related Top Level Category, Related Subcategory",
    );
  }
  const out: CsvLink[] = [];
  for (const cells of rows.slice(1)) {
    const topLevel = (cells[topIdx] ?? "").trim();
    const subcategory = (cells[subIdx] ?? "").trim();
    const relatedTopLevel = (cells[relTopIdx] ?? "").trim();
    const relatedSubcategory = (cells[relSubIdx] ?? "").trim();
    if (!topLevel && !subcategory && !relatedTopLevel && !relatedSubcategory) continue;
    if (!topLevel || !subcategory || !relatedTopLevel || !relatedSubcategory) {
      throw new Error(
        `Incomplete row: source=${JSON.stringify(topLevel)}/${JSON.stringify(subcategory)} related=${JSON.stringify(relatedTopLevel)}/${JSON.stringify(relatedSubcategory)}`,
      );
    }
    out.push({ topLevel, subcategory, relatedTopLevel, relatedSubcategory });
  }
  return out;
}

async function fetchAll<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  select: string,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch ${table}: ${error.message}`);
    const batch = (data ?? []) as unknown as T[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function resolveLeafId(
  leafByKey: Map<string, string>,
  topLevel: string,
  subcategory: string,
): string | null {
  return leafByKey.get(`${topLevel.trim()}|||${subcategory.trim()}`) ?? null;
}

async function main() {
  const { file, dryRun } = parseArgs(process.argv.slice(2));
  const csvRows = parseCategoryRelatedCsv(readFileSync(file, "utf8"));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const [categories, existingLinks] = await Promise.all([
    fetchAll<{
      id: string;
      title: string;
      parent_category_id: string | null;
      archived_at: string | null;
    }>(supabase, "business_categories", "id, title, parent_category_id, archived_at"),
    fetchAll<LinkRow>(
      supabase,
      "category_related_categories",
      "category_id, related_category_id",
    ),
  ]);

  const parents = new Map(
    categories
      .filter((c) => !c.parent_category_id)
      .map((c) => [String(c.id), c]),
  );
  const leafByKey = new Map<string, string>();
  for (const leaf of categories) {
    if (!leaf.parent_category_id || leaf.archived_at) continue;
    const parent = parents.get(String(leaf.parent_category_id));
    if (!parent) continue;
    const key = `${parent.title.trim()}|||${leaf.title.trim()}`;
    leafByKey.set(key, String(leaf.id));
  }

  const desired: LinkRow[] = [];
  const desiredKeys = new Set<string>();
  const unresolvedSource: string[] = [];
  const unresolvedRelated: string[] = [];
  const selfLinks: string[] = [];

  for (const row of csvRows) {
    const categoryId = resolveLeafId(leafByKey, row.topLevel, row.subcategory);
    if (!categoryId) {
      unresolvedSource.push(`${row.topLevel}|||${row.subcategory}`);
      continue;
    }

    const relatedCategoryId = resolveLeafId(
      leafByKey,
      row.relatedTopLevel,
      row.relatedSubcategory,
    );
    if (!relatedCategoryId) {
      unresolvedRelated.push(`${row.relatedTopLevel}|||${row.relatedSubcategory}`);
      continue;
    }

    if (categoryId === relatedCategoryId) {
      selfLinks.push(`${row.topLevel}/${row.subcategory} → ${row.relatedTopLevel}/${row.relatedSubcategory}`);
      continue;
    }

    const key = `${categoryId}|||${relatedCategoryId}`;
    if (desiredKeys.has(key)) continue;
    desiredKeys.add(key);
    desired.push({ category_id: categoryId, related_category_id: relatedCategoryId });
  }

  if (unresolvedSource.length > 0) {
    const unique = [...new Set(unresolvedSource)].sort();
    console.error(`Unresolved source subcategories (${unique.length}):`);
    for (const c of unique.slice(0, 40)) console.error(`  ${c}`);
    throw new Error(`Could not resolve ${unique.length} source subcategory pair(s)`);
  }
  if (unresolvedRelated.length > 0) {
    const unique = [...new Set(unresolvedRelated)].sort();
    console.error(`Unresolved related subcategories (${unique.length}):`);
    for (const c of unique.slice(0, 40)) console.error(`  ${c}`);
    throw new Error(`Could not resolve ${unique.length} related subcategory pair(s)`);
  }
  if (selfLinks.length > 0) {
    console.warn(`Skipped ${selfLinks.length} self-link row(s)`);
  }

  const existingKeys = new Set(
    existingLinks.map((r) => `${r.category_id}|||${r.related_category_id}`),
  );
  const toAdd = desired.filter(
    (r) => !existingKeys.has(`${r.category_id}|||${r.related_category_id}`),
  );
  const toDelete = existingLinks.filter(
    (r) => !desiredKeys.has(`${r.category_id}|||${r.related_category_id}`),
  );

  console.log(`Source: ${file} (${csvRows.length} rows → ${desired.length} unique links)`);
  console.log(`Live links: ${existingLinks.length}`);
  console.log(`Add: ${toAdd.length}`);
  console.log(`Delete: ${toDelete.length}`);
  console.log(`Unchanged: ${desired.length - toAdd.length}`);

  if (dryRun) {
    console.log("\nDry run — no changes written.");
    return;
  }

  for (let i = 0; i < desired.length; i += PAGE) {
    const chunk = desired.slice(i, i + PAGE);
    const { error } = await supabase
      .from("category_related_categories")
      .upsert(chunk, { onConflict: "category_id,related_category_id" });
    if (error) throw new Error(`upsert: ${error.message}`);
  }

  for (const row of toDelete) {
    const { error } = await supabase
      .from("category_related_categories")
      .delete()
      .eq("category_id", row.category_id)
      .eq("related_category_id", row.related_category_id);
    if (error) throw new Error(`delete: ${error.message}`);
  }

  const after = await fetchAll<LinkRow>(
    supabase,
    "category_related_categories",
    "category_id, related_category_id",
  );
  console.log(`\nDone. Links now ${after.length}.`);
  if (after.length !== desired.length) {
    console.warn(`Warning: live count ${after.length} != desired ${desired.length}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
