/**
 * Sync search_tags_vocabulary to match a CSV of {tag, description}.
 *
 * - Upserts every CSV row (add new tags + update changed descriptions)
 * - Deletes vocabulary rows not present in the CSV
 * - Optionally strips deleted tags from businesses.search_tags
 *
 * Usage:
 *   npx tsx scripts/import-business-tags-csv.ts --dry-run
 *   npx tsx scripts/import-business-tags-csv.ts
 *   npx tsx scripts/import-business-tags-csv.ts --file docs/tags-final.csv
 *   npx tsx scripts/import-business-tags-csv.ts --skip-business-prune
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config({ path: ".env.local" });

const DEFAULT_FILE = "docs/tags-final.csv";
const PAGE = 1000;

type VocabRow = { tag: string; description: string };
type BusinessTagRow = { id: string; search_tags: string[] | null };

function parseArgs(argv: string[]) {
  let file = DEFAULT_FILE;
  let dryRun = false;
  let skipBusinessPrune = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--skip-business-prune") skipBusinessPrune = true;
    else if (a === "--file") {
      file = argv[++i] ?? DEFAULT_FILE;
    } else if (a.startsWith("--file=")) {
      file = a.slice("--file=".length);
    }
  }
  return { file, dryRun, skipBusinessPrune };
}

/** Minimal CSV parser for tag,description (handles quotes / commas in description). */
function parseTagCsv(text: string): VocabRow[] {
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

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const tagIdx = header.indexOf("tag");
  const descIdx = header.indexOf("description");
  if (tagIdx < 0) {
    throw new Error("CSV must have a 'tag' column");
  }

  const out: VocabRow[] = [];
  const seen = new Set<string>();
  for (const cells of rows.slice(1)) {
    const tag = (cells[tagIdx] ?? "").trim();
    if (!tag) continue;
    if (seen.has(tag)) {
      throw new Error(`Duplicate tag in CSV: ${tag}`);
    }
    seen.add(tag);
    out.push({
      tag,
      description: (descIdx >= 0 ? cells[descIdx] ?? "" : "").trim(),
    });
  }
  return out;
}

async function fetchAllVocab(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("search_tags_vocabulary")
      .select("tag, description")
      .order("tag", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch vocabulary: ${error.message}`);
    const batch = (data ?? []) as VocabRow[];
    for (const r of batch) {
      map.set(String(r.tag), (r.description ?? "").trim());
    }
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

async function upsertBatch(supabase: SupabaseClient, rows: VocabRow[]) {
  for (let i = 0; i < rows.length; i += PAGE) {
    const chunk = rows.slice(i, i + PAGE);
    const { error } = await supabase.from("search_tags_vocabulary").upsert(
      chunk.map((r) => ({ tag: r.tag, description: r.description })),
      { onConflict: "tag" },
    );
    if (error) throw new Error(`upsert: ${error.message}`);
  }
}

async function deleteTags(supabase: SupabaseClient, tags: string[]) {
  for (let i = 0; i < tags.length; i += PAGE) {
    const chunk = tags.slice(i, i + PAGE);
    const { error } = await supabase
      .from("search_tags_vocabulary")
      .delete()
      .in("tag", chunk);
    if (error) throw new Error(`delete vocabulary: ${error.message}`);
  }
}

async function pruneBusinessSearchTags(
  supabase: SupabaseClient,
  deleted: Set<string>,
) {
  if (deleted.size === 0) return { businessesUpdated: 0, tagsRemoved: 0 };

  let businessesUpdated = 0;
  let tagsRemoved = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, search_tags")
      .not("search_tags", "eq", "{}")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch businesses: ${error.message}`);
    const batch = (data ?? []) as BusinessTagRow[];
    for (const b of batch) {
      const tags = Array.isArray(b.search_tags) ? b.search_tags : [];
      if (tags.length === 0) continue;
      const next = tags.filter((t) => !deleted.has(t));
      if (next.length === tags.length) continue;
      tagsRemoved += tags.length - next.length;
      businessesUpdated += 1;
      const { error: upErr } = await supabase
        .from("businesses")
        .update({ search_tags: next })
        .eq("id", b.id);
      if (upErr) throw new Error(`prune business ${b.id}: ${upErr.message}`);
    }
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return { businessesUpdated, tagsRemoved };
}

async function main() {
  const { file, dryRun, skipBusinessPrune } = parseArgs(process.argv.slice(2));
  const desired = parseTagCsv(readFileSync(file, "utf8"));
  const desiredMap = new Map(desired.map((r) => [r.tag, r.description]));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const current = await fetchAllVocab(supabase);

  const toAdd: VocabRow[] = [];
  const toUpdate: VocabRow[] = [];
  for (const row of desired) {
    if (!current.has(row.tag)) toAdd.push(row);
    else if ((current.get(row.tag) ?? "") !== row.description) toUpdate.push(row);
  }
  const toDelete = [...current.keys()].filter((t) => !desiredMap.has(t)).sort();

  console.log(`Source: ${file} (${desired.length} tags)`);
  console.log(`Live vocabulary: ${current.size} tags`);
  console.log(`Add: ${toAdd.length}`);
  console.log(`Update descriptions: ${toUpdate.length}`);
  console.log(`Delete: ${toDelete.length}`);
  if (toUpdate.length && toUpdate.length <= 30) {
    for (const r of toUpdate) {
      console.log(`  ~ ${r.tag}: ${JSON.stringify(current.get(r.tag))} -> ${JSON.stringify(r.description)}`);
    }
  }
  if (toDelete.length && toDelete.length <= 100) {
    console.log(`  - ${toDelete.join(", ")}`);
  } else if (toDelete.length) {
    console.log(`  - ${toDelete.slice(0, 40).join(", ")} … (+${toDelete.length - 40} more)`);
  }

  if (dryRun) {
    console.log("\nDry run — no changes written.");
    return;
  }

  await upsertBatch(supabase, [...toAdd, ...toUpdate]);
  await deleteTags(supabase, toDelete);

  let prune = { businessesUpdated: 0, tagsRemoved: 0 };
  if (!skipBusinessPrune && toDelete.length > 0) {
    prune = await pruneBusinessSearchTags(supabase, new Set(toDelete));
  }

  const after = await fetchAllVocab(supabase);
  console.log(`\nDone. Vocabulary now ${after.size} tags.`);
  if (!skipBusinessPrune) {
    console.log(
      `Pruned ${prune.tagsRemoved} deleted tag refs from ${prune.businessesUpdated} businesses.`,
    );
  }
  if (after.size !== desired.length) {
    console.warn(
      `Warning: live count ${after.size} != CSV count ${desired.length}`,
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
