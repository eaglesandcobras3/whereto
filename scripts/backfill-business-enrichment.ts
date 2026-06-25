/**
 * Full search enrichment backfill for published businesses missing profile data.
 *
 * Fixes in order:
 *   1. primary_category_id (heuristic + AI)
 *   2. business_type, tags, qa_document, search_profile (OpenAI when missing)
 *   3. search_tags, search_terms, embedding_summary (derived)
 *   4. embedding vector (OpenAI)
 *
 * Usage:
 *   npx tsx scripts/backfill-business-enrichment.ts --dry-run
 *   npx tsx scripts/backfill-business-enrichment.ts --apply
 *   npx tsx scripts/backfill-business-enrichment.ts --apply --limit 20
 *   npx tsx scripts/backfill-business-enrichment.ts --apply --id <uuid>
 *   npx tsx scripts/backfill-business-enrichment.ts --apply --skip-ai    # heuristics + derive only
 *   npx tsx scripts/backfill-business-enrichment.ts --apply --embeddings-only
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { businessNeedsEnrichment } from "../lib/search/business-enrichment-schema";
import { runBusinessEnrichmentBackfill, type ApplyEnrichmentResult, type BusinessRowForEnrichment, type EnrichmentProgressEvent } from "../lib/search/run-business-enrichment";
import {
  businessEmbeddingInput,
  embedBusinessText,
  embeddingToPgvector,
} from "../lib/search/business-embedding";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
const SKIP_AI = process.argv.includes("--skip-ai");
const EMBEDDINGS_ONLY = process.argv.includes("--embeddings-only");
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Math.max(1, Number(process.argv[limitIdx + 1]) || 0) : null;
const idIdx = process.argv.indexOf("--id");
const SINGLE_ID = idIdx >= 0 ? process.argv[idIdx + 1] : undefined;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SELECT =
  "id, title, excerpt, content, search_keywords, business_type, search_profile, item_tags, primary_category_id, embedding, is_service_business, is_storefront, towns ( title )";

async function loadTargets(): Promise<BusinessRowForEnrichment[]> {
  const PAGE = 200;
  const out: BusinessRowForEnrichment[] = [];

  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("businesses")
      .select(SELECT)
      .is("archived_at", null)
      .eq("status", "published")
      .order("title")
      .range(from, from + PAGE - 1);

    if (SINGLE_ID) {
      q = supabase.from("businesses").select(SELECT).eq("id", SINGLE_ID);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    if (batch.length === 0) break;

    for (const raw of batch) {
      const r = raw as Record<string, unknown>;
      const town = r.towns as { title?: string } | null;
      const row: BusinessRowForEnrichment = {
        id: String(r.id),
        title: String(r.title ?? ""),
        excerpt: (r.excerpt as string | null) ?? null,
        content: (r.content as string | null) ?? null,
        search_keywords: (r.search_keywords as string | null) ?? null,
        town_name: town?.title ?? null,
        is_service_business: Boolean(r.is_service_business),
        is_storefront: Boolean(r.is_storefront),
        business_type: (r.business_type as string | null) ?? null,
        search_profile: (r.search_profile as string | null) ?? null,
        item_tags: (r.item_tags as string[] | null) ?? null,
        primary_category_id: (r.primary_category_id as string | null) ?? null,
        embedding: r.embedding,
      };

      const needs =
        EMBEDDINGS_ONLY ? !row.embedding : businessNeedsEnrichment(row) || !row.primary_category_id;
      if (needs) out.push(row);
      if (LIMIT && out.length >= LIMIT) return out;
    }

    if (SINGLE_ID || batch.length < PAGE) break;
  }

  return out;
}

async function embeddingsOnlyBackfill(rows: BusinessRowForEnrichment[]) {
  if (!openaiKey) {
    console.error("OPENAI_API_KEY required for embeddings");
    process.exit(1);
  }

  let updated = 0;
  for (const row of rows) {
    const { data } = await supabase
      .from("businesses")
      .select(
        "title, excerpt, business_type, search_profile, embedding_summary, search_terms, item_tags",
      )
      .eq("id", row.id)
      .maybeSingle();
    if (!data) continue;

    const text = businessEmbeddingInput(data as Parameters<typeof businessEmbeddingInput>[0]);
    if (DRY_RUN) {
      console.log(`  ${row.title}: would embed (${text.slice(0, 60)}…)`);
      continue;
    }

    const embedding = await embedBusinessText(text, openaiKey);
    if (!embedding) {
      console.error(`  ✗ ${row.title}: embed failed`);
      continue;
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        embedding: embeddingToPgvector(embedding),
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (error) console.error(`  ✗ ${row.title}: ${error.message}`);
    else {
      updated++;
      console.log(`  ✓ ${row.title}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\nEmbeddings: ${updated} updated`);
}

function formatResultLine(r: ApplyEnrichmentResult, dryRun: boolean): string {
  const label = `${r.title} → ${r.steps.join(", ")}`;
  if (r.error) return `  ✗ ${label} (${r.error})`;
  if (dryRun) return `  ? ${label}`;
  if (r.updated) return `  ✓ ${label}`;
  return `  - ${label} (no changes)`;
}

function onProgress(event: EnrichmentProgressEvent) {
  switch (event.phase) {
    case "ai-start":
      console.log(`\nGenerating AI profiles for ${event.total} businesses (${event.batchCount} batches)…`);
      break;
    case "ai-batch":
      console.log(
        `\n  AI batch ${event.batch}/${event.batchCount}: ${event.titles.slice(0, 3).join(", ")}${event.titles.length > 3 ? ` +${event.titles.length - 3} more` : ""}`,
      );
      break;
    case "ai-batch-done":
      console.log(`  ✓ batch ${event.batch}/${event.batchCount} done (${event.enriched} profiles)`);
      break;
    case "ai-done":
      console.log(`\nAI enrichment complete (${event.enriched} profiles)\n`);
      break;
    case "ai-skipped":
      console.log(`\nSkipping AI (${event.reason}) — ${event.total} would need profiles\n`);
      break;
    case "apply-start":
      console.log(`Writing ${event.total} businesses…\n`);
      break;
    case "apply-row":
      process.stdout.write(`${formatResultLine(event.result, DRY_RUN)}\n`);
      break;
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "APPLY"}`);
  if (EMBEDDINGS_ONLY) console.log("Scope: embeddings only");
  else if (SKIP_AI) console.log("Scope: heuristics + derived search document (no OpenAI enrichment)");

  const rows = await loadTargets();
  console.log(`Targets: ${rows.length}\n`);
  if (rows.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  if (EMBEDDINGS_ONLY) {
    await embeddingsOnlyBackfill(rows);
    return;
  }

  if (!SKIP_AI && !openaiKey) {
    console.error("OPENAI_API_KEY required unless --skip-ai");
    process.exit(1);
  }

  const results = await runBusinessEnrichmentBackfill(supabase, rows, {
    apply: !DRY_RUN,
    skipAi: SKIP_AI,
    openaiKey: openaiKey ?? undefined,
    onProgress,
  });

  let updated = 0;
  let failed = 0;
  for (const r of results) {
    if (r.error) failed++;
    else if (!DRY_RUN && r.updated) updated++;
  }

  console.log(`\nDone. updated=${updated} failed=${failed} dry=${DRY_RUN}`);
  if (DRY_RUN) console.log("Run with --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
