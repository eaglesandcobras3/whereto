/**
 * Copy towns.at_a_glance_description → towns.excerpt when glance copy is present.
 * Does not touch seo_description (that stays for metadata; hero intro uses excerpt).
 *
 * Usage:
 *   npx tsx scripts/sync-town-excerpt-from-glance.ts
 *   npx tsx scripts/sync-town-excerpt-from-glance.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function main() {
  const { data, error } = await supabase
    .from("towns")
    .select("id, slug, title, excerpt, at_a_glance_description")
    .order("title", { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — sync excerpt from at_a_glance_description`);

  let updated = 0;
  let skipped = 0;
  let unchanged = 0;
  let failed = 0;

  for (const row of data ?? []) {
    const slug = String(row.slug ?? "");
    const glance = normalize(row.at_a_glance_description as string | null);
    if (!glance) {
      console.log(`  ${slug}: skip (no at_a_glance_description)`);
      skipped++;
      continue;
    }

    const excerpt = normalize(row.excerpt as string | null);
    if (excerpt === glance) {
      console.log(`  ${slug}: unchanged`);
      unchanged++;
      continue;
    }

    console.log(`  ${slug}: would set excerpt`);
    if (!APPLY) {
      updated++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("towns")
      .update({ excerpt: glance })
      .eq("id", row.id);

    if (updateErr) {
      console.error(`  ${slug}: failed — ${updateErr.message}`);
      failed++;
      continue;
    }
    console.log(`  ${slug}: updated`);
    updated++;
  }

  console.log(
    `\nDone. updated=${updated} unchanged=${unchanged} skipped=${skipped} failed=${failed}` +
      (APPLY ? "" : " (dry-run; pass --apply to write)"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
