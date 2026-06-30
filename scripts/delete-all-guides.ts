/**
 * Delete every row in public.guides and related junction / content_entries rows.
 *
 * Usage:
 *   npx tsx scripts/delete-all-guides.ts           # report counts only
 *   npx tsx scripts/delete-all-guides.ts --apply   # perform deletion
 */

import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const APPLY = process.argv.includes("--apply");

async function countTable(
  supabase: ReturnType<typeof createClient>,
  table: string,
  filter?: { column: string; value: string },
): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.column, filter.value);
  const { count, error } = await q;
  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") return 0;
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function deleteAll(
  supabase: ReturnType<typeof createClient>,
  table: string,
  filter?: { column: string; value: string },
): Promise<number | null> {
  let q = supabase.from(table).delete({ count: "exact" });
  if (filter) {
    q = q.eq(filter.column, filter.value);
  } else {
    q = q.not("id", "is", null);
  }
  const { count, error } = await q;
  if (error) {
    if (
      error.code === "42P01" ||
      error.message.includes("does not exist") ||
      error.message.includes("schema cache")
    ) {
      return null;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const counts = {
    guides: await countTable(supabase, "guides"),
    guide_towns: await countTable(supabase, "guide_towns"),
    guide_areas: await countTable(supabase, "guide_areas"),
    guide_businesses: await countTable(supabase, "guide_businesses"),
    content_entries: await countTable(supabase, "content_entries", {
      column: "content_type",
      value: "guide",
    }),
  };

  console.log(APPLY ? "Deleting guides…\n" : "Guide deletion preview (dry run)\n");
  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ${table}: ${n}`);
  }

  if (counts.guides === 0 && counts.content_entries === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  if (!APPLY) {
    console.log("\nRe-run with --apply to delete these rows.");
    return;
  }

  const deleted = {
    guide_businesses: await deleteAll(supabase, "guide_businesses"),
    guide_areas: await deleteAll(supabase, "guide_areas"),
    guide_towns: await deleteAll(supabase, "guide_towns"),
    content_entries: await deleteAll(supabase, "content_entries", {
      column: "content_type",
      value: "guide",
    }),
    guides: await deleteAll(supabase, "guides"),
  };

  console.log("\nDeleted:");
  for (const [table, n] of Object.entries(deleted)) {
    console.log(`  ${table}: ${n == null ? "(skipped — table missing)" : n}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
