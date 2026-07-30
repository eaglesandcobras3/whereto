/**
 * Sync search_tag_categories from docs/tags-cats.csv.
 *
 * Columns: Top Level Category, Subcategory, Suggested Tag
 * Resolves subcategory via (parent title, leaf title) on business_categories,
 * and tags via vocabulary description (casefold) or slugify(label).
 *
 * Replace-sync: upserts all CSV pairs, deletes pairs not in the CSV.
 *
 * Usage:
 *   npx tsx scripts/import-tag-categories-csv.ts --dry-run
 *   npx tsx scripts/import-tag-categories-csv.ts
 *   npx tsx scripts/import-tag-categories-csv.ts --file docs/tags-cats.csv
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { normalizeSlug } from "./lib/tag-vocabulary";

dotenv.config({ path: ".env.local" });

const DEFAULT_FILE = "docs/tags-cats.csv";
const PAGE = 1000;

type CsvLink = {
  topLevel: string;
  subcategory: string;
  suggestedTag: string;
};

type LinkRow = { tag: string; category_id: string };

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

function parseTagsCatsCsv(text: string): CsvLink[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const topIdx = header.indexOf("top level category");
  const subIdx = header.indexOf("subcategory");
  const tagIdx = header.indexOf("suggested tag");
  if (topIdx < 0 || subIdx < 0 || tagIdx < 0) {
    throw new Error(
      "CSV must have columns: Top Level Category, Subcategory, Suggested Tag",
    );
  }
  const out: CsvLink[] = [];
  for (const cells of rows.slice(1)) {
    const topLevel = (cells[topIdx] ?? "").trim();
    const subcategory = (cells[subIdx] ?? "").trim();
    const suggestedTag = (cells[tagIdx] ?? "").trim();
    if (!topLevel && !subcategory && !suggestedTag) continue;
    if (!topLevel || !subcategory || !suggestedTag) {
      throw new Error(
        `Incomplete row: top=${JSON.stringify(topLevel)} sub=${JSON.stringify(subcategory)} tag=${JSON.stringify(suggestedTag)}`,
      );
    }
    out.push({ topLevel, subcategory, suggestedTag });
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

async function main() {
  const { file, dryRun } = parseArgs(process.argv.slice(2));
  const csvRows = parseTagsCatsCsv(readFileSync(file, "utf8"));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const [vocab, categories, existingLinks] = await Promise.all([
    fetchAll<{ tag: string; description: string | null }>(
      supabase,
      "search_tags_vocabulary",
      "tag, description",
    ),
    fetchAll<{
      id: string;
      title: string;
      parent_category_id: string | null;
      archived_at: string | null;
      status: string | null;
    }>(
      supabase,
      "business_categories",
      "id, title, parent_category_id, archived_at, status",
    ),
    fetchAll<LinkRow>(supabase, "search_tag_categories", "tag, category_id"),
  ]);

  const tagByDescription = new Map<string, string>();
  const tagSet = new Set<string>();
  for (const v of vocab) {
    const tag = String(v.tag ?? "").trim();
    if (!tag) continue;
    tagSet.add(tag);
    const desc = (v.description ?? "").trim();
    if (desc) tagByDescription.set(desc.toLowerCase(), tag);
  }

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
  const unresolvedTags: string[] = [];
  const unresolvedCats: string[] = [];

  for (const row of csvRows) {
    const catKey = `${row.topLevel}|||${row.subcategory}`;
    const categoryId = leafByKey.get(catKey);
    if (!categoryId) {
      unresolvedCats.push(catKey);
      continue;
    }

    const viaDesc = tagByDescription.get(row.suggestedTag.toLowerCase());
    const viaSlug = normalizeSlug(row.suggestedTag);
    const tag =
      viaDesc ?? (tagSet.has(viaSlug) ? viaSlug : null);
    if (!tag) {
      unresolvedTags.push(row.suggestedTag);
      continue;
    }

    const key = `${tag}|||${categoryId}`;
    if (desiredKeys.has(key)) continue;
    desiredKeys.add(key);
    desired.push({ tag, category_id: categoryId });
  }

  if (unresolvedCats.length > 0) {
    const unique = [...new Set(unresolvedCats)].sort();
    console.error(`Unresolved subcategories (${unique.length}):`);
    for (const c of unique.slice(0, 40)) console.error(`  ${c}`);
    throw new Error(`Could not resolve ${unique.length} subcategory pair(s)`);
  }
  if (unresolvedTags.length > 0) {
    const unique = [...new Set(unresolvedTags)].sort();
    console.error(`Unresolved tags (${unique.length}):`);
    for (const t of unique.slice(0, 40)) console.error(`  ${t}`);
    throw new Error(`Could not resolve ${unique.length} suggested tag(s)`);
  }

  const existingKeys = new Set(
    existingLinks.map((r) => `${r.tag}|||${r.category_id}`),
  );
  const toAdd = desired.filter((r) => !existingKeys.has(`${r.tag}|||${r.category_id}`));
  const toDelete = existingLinks.filter(
    (r) => !desiredKeys.has(`${r.tag}|||${r.category_id}`),
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
      .from("search_tag_categories")
      .upsert(chunk, { onConflict: "tag,category_id" });
    if (error) throw new Error(`upsert: ${error.message}`);
  }

  for (let i = 0; i < toDelete.length; i += PAGE) {
    const chunk = toDelete.slice(i, i + PAGE);
    // Delete by composite: filter each pair (PostgREST has no multi-col IN).
    for (const row of chunk) {
      const { error } = await supabase
        .from("search_tag_categories")
        .delete()
        .eq("tag", row.tag)
        .eq("category_id", row.category_id);
      if (error) throw new Error(`delete: ${error.message}`);
    }
  }

  const after = await fetchAll<LinkRow>(
    supabase,
    "search_tag_categories",
    "tag, category_id",
  );
  console.log(`\nDone. Links now ${after.length}.`);
  if (after.length !== desired.length) {
    console.warn(
      `Warning: live count ${after.length} != desired ${desired.length}`,
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
