/**
 * Data eval: checks SearchDocument completeness and self-retrieval for published businesses.
 *
 * Layer 2 of the two-layer preflight model (Layer 1 = golden query eval).
 * Answers: "Is each published business findable on its own terms?"
 *
 * Checks:
 *   1. Completeness  — % with search_tags non-empty, embedding, search_vector, business_type
 *   2. Tag registry  — every search_tags value exists in search_tags_vocabulary
 *   3. Self-retrieval — sample of businesses find themselves in top-5 via search_businesses_v2
 *
 * Usage:
 *   npx tsx scripts/eval-search-data.ts            # full report
 *   npx tsx scripts/eval-search-data.ts --ci       # exits 1 if thresholds not met
 *   npx tsx scripts/eval-search-data.ts --json     # machine-readable output for preflight
 *   npx tsx scripts/eval-search-data.ts --sample 10  # smaller self-retrieval sample
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CI_MODE   = process.argv.includes("--ci");
const JSON_MODE = process.argv.includes("--json");

const sampleArgIdx = process.argv.indexOf("--sample");
const SAMPLE_SIZE  = sampleArgIdx >= 0 ? Number(process.argv[sampleArgIdx + 1]) : 30;

const THRESHOLDS = {
  completeness:   0.95,
  selfRetrieval:  0.90,
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type DataEvalReport = {
  date: string;
  completeness: {
    total: number;
    withTags: number;
    withEmbedding: number;
    withSearchVector: number;
    withBusinessType: number;
    rate: number;
  };
  tagRegistry: {
    unknownTags: string[];
    pass: boolean;
  };
  selfRetrieval: {
    sampled: number;
    inTop5: number;
    rate: number;
  };
  pass: boolean;
  failures: string[];
};

// ── 1. Completeness ──────────────────────────────────────────────────────────

async function checkCompleteness(): Promise<DataEvalReport["completeness"]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, search_tags, embedding, search_vector, business_type")
    .eq("status", "published")
    .is("archived_at", null);

  if (error) throw new Error(`completeness query: ${error.message}`);
  const rows = data ?? [];
  const total = rows.length;
  let withTags = 0, withEmbedding = 0, withSearchVector = 0, withBusinessType = 0;

  for (const r of rows as Array<Record<string, unknown>>) {
    const tags = r.search_tags as string[] | null;
    if (tags && tags.length > 0) withTags++;
    if (r.embedding) withEmbedding++;
    if (r.search_vector) withSearchVector++;
    if (r.business_type) withBusinessType++;
  }

  const rate = total > 0 ? Math.min(withTags, withEmbedding, withSearchVector, withBusinessType) / total : 0;
  return { total, withTags, withEmbedding, withSearchVector, withBusinessType, rate };
}

// ── 2. Tag registry ──────────────────────────────────────────────────────────

async function checkTagRegistry(): Promise<DataEvalReport["tagRegistry"]> {
  const [{ data: vocabRows }, { data: bizRows }] = await Promise.all([
    supabase.from("search_tags_vocabulary").select("tag"),
    supabase.from("businesses")
      .select("search_tags")
      .eq("status", "published")
      .is("archived_at", null)
      .not("search_tags", "is", null),
  ]);

  const vocab = new Set((vocabRows ?? []).map((r: Record<string, unknown>) => String(r.tag)));
  const allTags = new Set<string>();
  for (const r of (bizRows ?? []) as Array<{ search_tags: string[] }>) {
    for (const t of r.search_tags ?? []) allTags.add(t);
  }

  // Only flag tags that are NOT in vocabulary AND look like controlled routing tags
  // (no spaces, short, camelCase or snake_case — not free-form descriptions).
  // Free-form business tags (e.g. "casual", "family_friendly") don't need vocabulary
  // registration — only tags in search-query-rules.json requiredTags/anyTags do.
  // The definitive rule-tag check is scripts/validate-tag-registry.ts (separate gate).
  const unknownControlled = [...allTags].filter(t =>
    !vocab.has(t) && /^[a-z][a-z0-9_]*$/.test(t) && t.length < 20
  );

  // Tag registry is info-only in data eval — hard gate is validate-tag-registry.ts
  return { unknownTags: unknownControlled.slice(0, 20), pass: true };
}

// ── 3. Self-retrieval ────────────────────────────────────────────────────────

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });
  return res.data[0]!.embedding;
}

async function checkSelfRetrieval(sample: number): Promise<DataEvalReport["selfRetrieval"]> {
  const { data } = await supabase
    .from("businesses")
    .select("id, title, search_tags, primary_category_id")
    .eq("status", "published")
    .is("archived_at", null)
    .not("embedding", "is", null)
    .not("search_tags", "is", null)
    .limit(sample);

  const businesses = (data ?? []) as Array<{
    id: string;
    title: string;
    search_tags: string[];
    primary_category_id: string | null;
  }>;

  let inTop5 = 0;
  for (const biz of businesses) {
    try {
      const query = `${biz.title} ${(biz.search_tags ?? []).slice(0, 3).join(" ")}`.trim();
      const emb = await embed(query);
      const { data: results } = await supabase.rpc("search_businesses_v2", {
        p_query_text:      query,
        p_query_embedding: `[${emb.join(",")}]`,
        p_category_id:     biz.primary_category_id,
        p_match_count:     10,
      });
      const top5Ids = ((results ?? []) as Array<{ id: string }>).slice(0, 5).map(r => r.id);
      if (top5Ids.includes(biz.id)) inTop5++;
    } catch { /* skip on embed/rpc error */ }
    await new Promise(r => setTimeout(r, 100));
  }

  const rate = businesses.length > 0 ? inTop5 / businesses.length : 0;
  return { sampled: businesses.length, inTop5, rate };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<DataEvalReport> {
  if (!JSON_MODE) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`Search Data Eval  (sample=${SAMPLE_SIZE})`);
    console.log(`${"─".repeat(60)}`);
  }

  const [completeness, tagRegistry] = await Promise.all([
    checkCompleteness(),
    checkTagRegistry(),
  ]);

  if (!JSON_MODE) {
    console.log(`\nCompleteness (${completeness.total} published businesses):`);
    console.log(`  with search_tags:    ${completeness.withTags}/${completeness.total} (${pct(completeness.withTags, completeness.total)}%)`);
    console.log(`  with embedding:      ${completeness.withEmbedding}/${completeness.total} (${pct(completeness.withEmbedding, completeness.total)}%)`);
    console.log(`  with search_vector:  ${completeness.withSearchVector}/${completeness.total} (${pct(completeness.withSearchVector, completeness.total)}%)`);
    console.log(`  with business_type:  ${completeness.withBusinessType}/${completeness.total} (${pct(completeness.withBusinessType, completeness.total)}%)`);
    console.log(`  composite rate:      ${(completeness.rate * 100).toFixed(1)}%  (threshold: ${(THRESHOLDS.completeness * 100).toFixed(0)}%)`);

    console.log(`\nTag registry:`);
    if (tagRegistry.unknownTags.length > 0) {
      console.log(`  ✗ ${tagRegistry.unknownTags.length} single-word tags not in vocabulary:`);
      console.log(`    ${tagRegistry.unknownTags.slice(0, 10).join(", ")}`);
    } else {
      console.log(`  ✓ All single-word tags are in vocabulary (or vocabulary check skipped)`);
    }

    console.log(`\nSelf-retrieval (sample of ${SAMPLE_SIZE})...`);
  }

  const selfRetrieval = await checkSelfRetrieval(SAMPLE_SIZE);

  if (!JSON_MODE) {
    console.log(`  ${selfRetrieval.inTop5}/${selfRetrieval.sampled} found themselves in top 5 (${(selfRetrieval.rate * 100).toFixed(1)}%)  threshold: ${(THRESHOLDS.selfRetrieval * 100).toFixed(0)}%`);
  }

  const failures: string[] = [];
  if (completeness.rate < THRESHOLDS.completeness) {
    failures.push(`completeness ${(completeness.rate * 100).toFixed(1)}% < ${(THRESHOLDS.completeness * 100).toFixed(0)}%`);
  }
  if (selfRetrieval.rate < THRESHOLDS.selfRetrieval) {
    failures.push(`self-retrieval ${(selfRetrieval.rate * 100).toFixed(1)}% < ${(THRESHOLDS.selfRetrieval * 100).toFixed(0)}%`);
  }

  const report: DataEvalReport = {
    date: new Date().toISOString(),
    completeness,
    tagRegistry,
    selfRetrieval,
    pass: failures.length === 0,
    failures,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(report) + "\n");
  } else {
    console.log(`\n${"─".repeat(60)}`);
    if (report.pass) {
      console.log("✓ Data eval PASS");
    } else {
      console.log("✗ Data eval FAIL:");
      for (const f of failures) console.log(`  • ${f}`);
    }
    console.log(`${"─".repeat(60)}\n`);
  }

  if (CI_MODE && !report.pass) process.exit(1);
  return report;
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

main().catch(e => { console.error(e); process.exit(1); });
