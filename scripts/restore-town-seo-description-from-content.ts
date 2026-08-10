/**
 * Restore towns.seo_description from content/towns/*.md frontmatter.
 * Use after an accidental overwrite of SEO meta with at-a-glance copy.
 *
 * Usage:
 *   npx tsx scripts/restore-town-seo-description-from-content.ts
 *   npx tsx scripts/restore-town-seo-description-from-content.ts --apply
 */

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const CONTENT_DIR = join(process.cwd(), "content/towns");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function main() {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — restore seo_description from ${files.length} markdown file(s)`);

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  let unchanged = 0;
  let failed = 0;

  for (const file of files) {
    const fm = parseFrontmatter(readFileSync(join(CONTENT_DIR, file), "utf8"));
    const slug = (fm.slug ?? file.replace(/\.md$/, "")).trim();
    const seoDescription = (fm.seo_description ?? "").trim();
    if (!seoDescription) {
      console.log(`  ${slug}: skip (no seo_description in markdown)`);
      skipped++;
      continue;
    }

    const { data: existing, error } = await supabase
      .from("towns")
      .select("id, slug, seo_description")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error(`  ${slug}: load failed — ${error.message}`);
      failed++;
      continue;
    }
    if (!existing) {
      console.warn(`  ${slug}: no matching town`);
      missing++;
      continue;
    }

    const current = ((existing.seo_description as string | null) ?? "").trim();
    if (current === seoDescription) {
      console.log(`  ${slug}: unchanged`);
      unchanged++;
      continue;
    }

    console.log(`  ${slug}: would restore seo_description`);
    if (!APPLY) {
      updated++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("towns")
      .update({ seo_description: seoDescription })
      .eq("id", existing.id);

    if (updateErr) {
      console.error(`  ${slug}: update failed — ${updateErr.message}`);
      failed++;
      continue;
    }
    console.log(`  ${slug}: updated`);
    updated++;
  }

  console.log(
    `\nDone. updated=${updated} unchanged=${unchanged} skipped=${skipped} missing=${missing} failed=${failed}` +
      (APPLY ? "" : " (dry-run; pass --apply to write)"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
