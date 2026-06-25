/**
 * Generate embedding vectors for published businesses missing `embedding`.
 *
 * Usage:
 *   npx tsx scripts/generate-business-embeddings.ts --dry-run
 *   npx tsx scripts/generate-business-embeddings.ts --apply
 *   npx tsx scripts/generate-business-embeddings.ts --apply --id <uuid>
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  businessEmbeddingInput,
  embedBusinessText,
  embeddingToPgvector,
} from "../lib/search/business-embedding";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
const idIdx = process.argv.indexOf("--id");
const SINGLE_ID = idIdx >= 0 ? process.argv[idIdx + 1] : undefined;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, or OPENAI_API_KEY");
  process.exit(1);
}

const openaiApiKey: string = openaiKey;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  let q = supabase
    .from("businesses")
    .select(
      "id, title, excerpt, business_type, search_profile, embedding_summary, search_terms, item_tags",
    )
    .eq("status", "published")
    .is("archived_at", null)
    .is("embedding", null)
    .order("title");

  if (SINGLE_ID) q = q.eq("id", SINGLE_ID);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "APPLY"} — ${rows.length} businesses missing embedding\n`);

  let updated = 0;
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    const title = String(r.title ?? id);
    const text = businessEmbeddingInput(r as Parameters<typeof businessEmbeddingInput>[0]);

    if (!text.trim()) {
      console.log(`  skip ${title} (no embed text)`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ${title}: ${text.slice(0, 72)}…`);
      continue;
    }

    const embedding = await embedBusinessText(text, openaiApiKey);
    if (!embedding) {
      console.error(`  ✗ ${title}: API error`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from("businesses")
      .update({
        embedding: embeddingToPgvector(embedding),
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) console.error(`  ✗ ${title}: ${updateErr.message}`);
    else {
      updated++;
      process.stdout.write(".");
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\nDone. updated=${updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
