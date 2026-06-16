/**
 * Search quality evaluation — committed to repo so CI can run it.
 *
 * Port of local/eval-search.ts with tier-aware CI logic, pollutant merging,
 * --milestone baseline capture, and --json machine-readable output.
 *
 * Run all:          npx tsx scripts/eval-search.ts
 * Verbose:          VERBOSE=1 npx tsx scripts/eval-search.ts
 * Single query:     npx tsx scripts/eval-search.ts --query "bookstore"
 * CI mode:          npx tsx scripts/eval-search.ts --ci
 * Capture baseline: npx tsx scripts/eval-search.ts --milestone baseline-0
 * JSON output:      npx tsx scripts/eval-search.ts --json
 *
 * CI exit codes:
 *   0 = all regression-tier cases pass AND overall pass rate >= 70%
 *   1 = any regression-tier case has pollutants/minResults failure, OR overall pass rate < 70%
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import {
  computeComposite,
  type ScoringIntent,
} from '@/lib/search/scoring';
import {
  tryKeywordIntentMatch,
  parseIntentWithOpenAI,
} from '@/lib/ai/search-ai';
import { resolveQueryPlan } from '@/lib/search/resolve-query-plan';
import { loadTownScope } from '@/lib/search/location-scope';
import { normalizeQuery } from '@/lib/query-normalize';
import { v2EmbeddingInput } from '@/lib/search/v2-embedding-input';
import { computeV2RelevanceBoost } from '@/lib/search/v2-relevance-boost';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const CI_MODE   = args.includes('--ci');
const JSON_MODE = args.includes('--json');
const VERBOSE   = !CI_MODE && !JSON_MODE && (process.env.VERBOSE === '1');

const queryArgIdx = args.indexOf('--query');
const QUERY_ARG   = queryArgIdx >= 0 ? args[queryArgIdx + 1]?.toLowerCase() : undefined;
const SINGLE_Q    = QUERY_ARG ?? process.env.QUERY?.toLowerCase();

const milestoneArgIdx = args.indexOf('--milestone');
const MILESTONE       = milestoneArgIdx >= 0 ? args[milestoneArgIdx + 1] : undefined;

const pipelineArgIdx = args.indexOf('--pipeline');
const PIPELINE = pipelineArgIdx >= 0
  ? (args[pipelineArgIdx + 1] as 'v1-raw' | 'v1-full' | 'v2')
  : 'v1-raw';

// Model for v1-full intent parsing (matches what the API routes use)
const INTENT_MODEL = process.env.OPENAI_INTENT_MODEL ?? 'gpt-4o-mini';

const FETCH_COUNT = 50;

// ─── Tunable thresholds ───────────────────────────────────────────────────────
// Must match DEFAULT_SEARCH_RANK_CONFIG in lib/search/hybrid-vector-postprocess.ts
const MIN_VEC_FLOOR       = 0.22;
const COMPOSITE_THRESHOLD = 0.36;

// ─── Types ────────────────────────────────────────────────────────────────────

type Case = {
  id?: string;
  query: string;
  intent?: ScoringIntent;
  expect?: string[];
  notExpect?: string[];
  note?: string;
  tier?: 'regression' | 'smoke' | 'stretch';
  problemClass?: string;
  stratum?: string;
  audience?: 'visitor' | 'local' | 'both';
  minResults?: number;
  pollutantClass?: string;
};

type Row = Record<string, unknown> & { vec_similarity: number; _composite: number; _vec: number };

type Result = {
  id?: string;
  query: string;
  tier: 'regression' | 'smoke' | 'stretch';
  stratum?: string;
  problemClass?: string;
  note: string;
  top: { title: string; vec: number; composite: number; bizType: string }[];
  missed: string[];
  polluted: string[];
  mrr: number;
  pass: boolean;
  totalResults: number;
  minResultsFail: boolean;
  retrievalPath: 'v1_hybrid' | 'v1_full';
};

type EvalSummary = {
  total: number;
  passed: number;
  passRate: number;
  avgMRR: number;
  pollutedCount: number;
  byTier: Record<string, { total: number; passed: number; passRate: number; bad_in_top_10_count: number }>;
  byStratum: Record<string, { total: number; passed: number; passRate: number; bad_in_top_10_rate: number }>;
};

type BaselineReport = {
  milestone: string;
  date: string;
  pipeline: 'v1' | 'v2';
  golden_set_version: string;
  summary: EvalSummary;
  cases: Result[];
};

// ─── Load golden cases ────────────────────────────────────────────────────────

const goldenPath    = path.join(process.cwd(), 'eval', 'search-golden.json');
const pollutantsPath = path.join(process.cwd(), 'eval', 'pollutants.json');

const CASES_RAW: Case[] = JSON.parse(fs.readFileSync(goldenPath, 'utf-8')) as Case[];

const POLLUTANTS: Record<string, string[]> = fs.existsSync(pollutantsPath)
  ? (JSON.parse(fs.readFileSync(pollutantsPath, 'utf-8')) as Record<string, string[]>)
  : {};

// Merge pollutantClass into per-case notExpect
const CASES: Case[] = CASES_RAW.map(c => {
  if (!c.pollutantClass) return c;
  const extra = POLLUTANTS[c.pollutantClass] ?? [];
  return { ...c, notExpect: [...(c.notExpect ?? []), ...extra] };
});

// ─── v1-raw: direct RPC + golden intent scoring ───────────────────────────────

async function embed(q: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: q, dimensions: 1536 });
  return res.data[0]!.embedding;
}

async function searchRaw(q: string): Promise<Row[]> {
  const emb = await embed(q);
  const { data, error } = await supabase.rpc('hybrid_search_businesses', {
    query_text:       q,
    query_embedding:  `[${emb.join(',')}]`,
    match_count:      FETCH_COUNT,
    p_town_id:        null,
    p_town_ids:       null,
    p_anchor_town_id: null,
    p_category_id:    null,
  });
  if (error) throw new Error(error.message);
  return data as Row[];
}

function grade(rows: Row[], intent: ScoringIntent): Row[] {
  return rows
    .filter(r => r._vec >= MIN_VEC_FLOOR)
    .map(r => ({ ...r, _composite: computeComposite(r as Record<string, unknown>, intent, r._vec) }))
    .filter(r => r._composite >= COMPOSITE_THRESHOLD)
    .sort((a, b) => b._composite - a._composite);
}

// ─── v1-full: intent parse + category-filtered RPC (no server-only imports) ───
// Replicates the V1 production path: keyword match → LLM parse → RPC with category.
// This is what drives the real ~35% pass rate (vs 85% with golden intent in v1-raw).

type FullResult = {
  title: string;
  bizType: string;
  finalScore?: number;
  scoreBreakdownPresent?: boolean;
};

async function resolveCategoryId(categorySlug: string): Promise<string | null> {
  const { data } = await supabase
    .from('business_categories').select('id').eq('slug', categorySlug).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function resolveTownIdsForEval(
  townSlug: string,
  scope: 'exact' | 'near' | 'anywhere',
): Promise<string[] | null> {
  if (scope === 'anywhere') return null;
  const { data: townRow } = await supabase.from('towns').select('id').eq('slug', townSlug).maybeSingle();
  if (!(townRow as { id?: string } | null)?.id) return null;
  const anchorId = String((townRow as { id: string }).id);
  if (scope === 'near') {
    const { adjacentTownIds } = await loadTownScope(supabase, anchorId);
    return [anchorId, ...adjacentTownIds];
  }
  return [anchorId];
}

async function resolveServiceCategoryId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('service_categories').select('id').eq('slug', slug).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function searchV1Full(q: string): Promise<FullResult[]> {
  const normalized = normalizeQuery(q);

  // Mirror V1: keyword fast-path first, then LLM
  let intent: ScoringIntent = tryKeywordIntentMatch(normalized) ?? {};
  if (!Object.keys(intent).length && process.env.OPENAI_API_KEY) {
    try {
      intent = await parseIntentWithOpenAI(INTENT_MODEL, process.env.OPENAI_API_KEY, q, normalized);
    } catch { /* use empty intent on failure */ }
  }

  const categorySlug = (intent as { category?: string }).category;
  const categoryId   = categorySlug ? await resolveCategoryId(categorySlug) : null;
  const emb          = await embed(q);

  const { data, error } = await supabase.rpc('hybrid_search_businesses', {
    query_text:       q,
    query_embedding:  `[${emb.join(',')}]`,
    match_count:      FETCH_COUNT,
    p_town_id:        null,
    p_town_ids:       null,
    p_anchor_town_id: null,
    p_category_id:    categoryId,
  });
  if (error) throw new Error(error.message);

  const rows = (data as Row[]).map(r => ({ ...r, _vec: (r.vec_similarity as number) ?? 0, _composite: 0 }));
  const ranked = grade(rows, intent);
  return ranked.slice(0, 10).map(r => ({ title: String(r.title ?? ''), bizType: String(r.business_type ?? '') }));
}

// ─── v2: call search_businesses_v2 RPC via resolveQueryPlan ──────────────────
// Tests the new deterministic routing + hybrid SQL scoring end-to-end.

async function searchV2(q: string): Promise<FullResult[]> {
  const plan = resolveQueryPlan(q);
  const normalized = normalizeQuery(q);

  const [categoryId, serviceCategoryId, townIds] = await Promise.all([
    plan.categorySlug ? resolveCategoryId(plan.categorySlug) : Promise.resolve(null),
    plan.serviceCategorySlug ? resolveServiceCategoryId(plan.serviceCategorySlug) : Promise.resolve(null),
    plan.townSlug ? resolveTownIdsForEval(plan.townSlug, plan.scope) : Promise.resolve(null),
  ]);

  let embedding: number[] | null = null;
  if (process.env.OPENAI_API_KEY) {
    try {
      embedding = await embed(v2EmbeddingInput(plan, normalized));
    } catch { /* degraded FTS-only */ }
  }

  const { data, error } = await supabase.rpc('search_businesses_v2', {
    p_query_text:      q,
    p_query_embedding: embedding ? `[${embedding.join(',')}]` : null,
    p_category_id:     categoryId,
    p_service_category_id: serviceCategoryId,
    p_town_ids:        townIds,
    p_required_tags:   plan.requiredTags.length > 0 ? plan.requiredTags : null,
    p_any_tags:        plan.anyTags.length > 0 ? plan.anyTags : null,
    p_match_count:     36,
  });
  if (error) throw new Error(`search_businesses_v2: ${error.message}`);

  const rows = ((data as Array<Record<string, unknown>>) ?? [])
    .map((row) => ({
      row,
      finalScore:
        Number(row.final_score ?? 0) +
        computeV2RelevanceBoost(
          {
            title: row.title as string | null,
            search_tags: row.search_tags as string[] | null,
            business_type: row.business_type as string | null,
          },
          q,
          plan,
        ),
    }))
    .sort((a, b) => b.finalScore - a.finalScore);

  return rows.slice(0, 10).map(({ row, finalScore }) => ({
    title:                String(row.title ?? ''),
    bizType:              String(row.business_type ?? ''),
    finalScore,
    scoreBreakdownPresent: typeof row.fts_score === 'number' && typeof row.vec_score === 'number',
  }));
}

// ─── Case runner ──────────────────────────────────────────────────────────────

function gradeCase(
  titles: string[],
  top: Result['top'],
  tc: Case,
): Pick<Result, 'missed' | 'polluted' | 'mrr' | 'pass' | 'minResultsFail'> {
  const top10        = titles.slice(0, 10);
  const missed       = (tc.expect ?? []).filter(f => !titles.some(t => t.includes(f.toLowerCase())));
  const polluted     = (tc.notExpect ?? []).filter(f => top10.some(t => t.includes(f.toLowerCase())));
  const minResultsFail = typeof tc.minResults === 'number' && tc.minResults > 0 && titles.length === 0;

  let mrr = 0;
  if (tc.expect?.length) {
    for (let i = 0; i < titles.length; i++) {
      if (tc.expect.some(f => titles[i]!.includes(f.toLowerCase()))) {
        mrr = 1 / (i + 1); break;
      }
    }
  }

  const pass = missed.length === 0
    && polluted.length === 0
    && !minResultsFail
    && (tc.expect?.length ? mrr >= 0.5 : true);

  return { missed, polluted, mrr, pass, minResultsFail };
}

async function runCaseRaw(tc: Case): Promise<Result> {
  const intent = tc.intent ?? {};
  const raw    = await searchRaw(tc.query);
  const ranked = grade(raw.map(r => ({ ...r, _vec: (r.vec_similarity as number) ?? 0, _composite: 0 })), intent);

  const top = ranked.slice(0, 10).map(r => ({
    title:     String(r.title ?? ''),
    vec:       r._vec,
    composite: r._composite,
    bizType:   String(r.business_type ?? '—'),
  }));
  const titles = ranked.map(r => String(r.title ?? '').toLowerCase());

  return {
    id: tc.id, query: tc.query, tier: tc.tier ?? 'stretch',
    stratum: tc.stratum, problemClass: tc.problemClass, note: tc.note ?? '',
    top, totalResults: ranked.length, retrievalPath: 'v1_hybrid',
    ...gradeCase(titles, top, tc),
  };
}

async function runCaseFull(tc: Case): Promise<Result> {
  const results = await searchV1Full(tc.query);
  const top = results.slice(0, 10).map(r => ({ title: r.title, vec: 0, composite: 0, bizType: r.bizType }));
  const titles = results.map(r => r.title.toLowerCase());
  return {
    id: tc.id, query: tc.query, tier: tc.tier ?? 'stretch',
    stratum: tc.stratum, problemClass: tc.problemClass, note: tc.note ?? '',
    top, totalResults: results.length, retrievalPath: 'v1_full',
    ...gradeCase(titles, top, tc),
  };
}

async function runCaseV2(tc: Case): Promise<Result> {
  const results = await searchV2(tc.query);
  const top = results.slice(0, 10).map(r => ({
    title: r.title, vec: 0, composite: r.finalScore ?? 0, bizType: r.bizType,
  }));
  const titles = results.map(r => r.title.toLowerCase());
  // Hard rule from §0: every result must carry a score breakdown
  const breakdownMissing = results.some(r => r.scoreBreakdownPresent === false);
  const graded = gradeCase(titles, top, tc);
  return {
    id: tc.id, query: tc.query, tier: tc.tier ?? 'stretch',
    stratum: tc.stratum, problemClass: tc.problemClass, note: tc.note ?? '',
    top, totalResults: results.length, retrievalPath: 'v1_full', // reuse type; v2 logged in notes
    ...graded,
    pass: graded.pass && !breakdownMissing,
    polluted: breakdownMissing ? [...graded.polluted, '⚠ score_breakdown_missing'] : graded.polluted,
  };
}

async function runCase(tc: Case): Promise<Result> {
  if (PIPELINE === 'v1-full') return runCaseFull(tc);
  if (PIPELINE === 'v2')      return runCaseV2(tc);
  return runCaseRaw(tc);
}

// ─── Output ───────────────────────────────────────────────────────────────────

function f(n: number) { return n.toFixed(3); }

function printResult(r: Result, tc: Case, verbose: boolean) {
  const icon = r.pass ? '✅' : '❌';
  const tierLabel = r.tier === 'regression' ? ' [REG]' : r.tier === 'smoke' ? ' [SMO]' : '';
  console.log(`\n${icon}${tierLabel} "${r.query}"`);
  if (r.note) console.log(`   ${r.note}`);

  if (verbose || !r.pass) {
    for (const row of r.top) {
      const hit     = (tc.expect ?? []).some(f => row.title.toLowerCase().includes(f.toLowerCase()));
      const pollute = (tc.notExpect ?? []).some(f => row.title.toLowerCase().includes(f.toLowerCase()));
      console.log(`   ${f(row.composite)} v:${f(row.vec)}  ${row.title}  [${row.bizType}]${hit ? ' ✓' : ''}${pollute ? ' ✗ POLLUTANT' : ''}`);
    }
  }
  if (r.missed.length)      console.log(`   MISSING: ${r.missed.join(', ')}`);
  if (r.polluted.length)    console.log(`   POLLUTANTS: ${r.polluted.join(', ')}`);
  if (r.minResultsFail)     console.log(`   MIN RESULTS FAIL: 0 results, expected >= ${tc.minResults}`);
  if (r.mrr)                console.log(`   MRR: ${f(r.mrr)} (first hit rank ${Math.round(1 / r.mrr)})`);
}

function buildSummary(results: Result[], cases: Case[]): EvalSummary {
  const withExpect = results.filter((_, i) => (cases[i]?.expect?.length ?? 0) > 0);
  const passed     = results.filter(r => r.pass).length;
  const avgMRR     = withExpect.length
    ? withExpect.reduce((s, r) => s + r.mrr, 0) / withExpect.length
    : 0;
  const pollutedCount = results.filter(r => r.polluted.length > 0).length;

  const byTier: EvalSummary['byTier'] = {};
  for (const r of results) {
    const t = r.tier;
    if (!byTier[t]) byTier[t] = { total: 0, passed: 0, passRate: 0, bad_in_top_10_count: 0 };
    byTier[t]!.total++;
    if (r.pass) byTier[t]!.passed++;
    if (r.polluted.length > 0) byTier[t]!.bad_in_top_10_count++;
  }
  for (const t of Object.keys(byTier)) {
    const b = byTier[t]!;
    b.passRate = b.total > 0 ? b.passed / b.total : 1;
  }

  const byStratum: EvalSummary['byStratum'] = {};
  for (const r of results) {
    const s = r.stratum ?? 'untagged';
    if (!byStratum[s]) byStratum[s] = { total: 0, passed: 0, passRate: 0, bad_in_top_10_rate: 0 };
    byStratum[s]!.total++;
    if (r.pass) byStratum[s]!.passed++;
    if (r.polluted.length > 0) byStratum[s]!.bad_in_top_10_rate++;
  }
  for (const s of Object.keys(byStratum)) {
    const b = byStratum[s]!;
    b.passRate = b.total > 0 ? b.passed / b.total : 1;
    b.bad_in_top_10_rate = b.total > 0 ? b.bad_in_top_10_rate / b.total : 0;
  }

  return {
    total: results.length,
    passed,
    passRate: results.length > 0 ? passed / results.length : 1,
    avgMRR,
    pollutedCount,
    byTier,
    byStratum,
  };
}

function writeBaseline(report: BaselineReport, milestone: string) {
  const dir = path.join(process.cwd(), 'eval', 'baselines');
  fs.mkdirSync(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}_${milestone}.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(report, null, 2));
  console.log(`\nBaseline written: eval/baselines/${filename}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cases = SINGLE_Q
    ? CASES.filter(c => c.query.toLowerCase().includes(SINGLE_Q))
    : CASES;

  if (!JSON_MODE) {
    console.log(`\n${'═'.repeat(72)}`);
    const pipelineLabel = PIPELINE === 'v1-full'
      ? 'pipeline=v1-full (V1: intent parse + category filter + composite grade)'
      : PIPELINE === 'v2'
      ? 'pipeline=v2 (deterministic routing + search_businesses_v2 RPC)'
      : `pipeline=v1-raw (direct RPC + golden intent | floor=${MIN_VEC_FLOOR} threshold=${COMPOSITE_THRESHOLD})`;
    console.log(`Search Quality Eval  (${cases.length} cases | ${pipelineLabel})`);
    console.log(`${'═'.repeat(72)}`);
  }

  const results: Result[] = [];
  for (const tc of cases) {
    try {
      const r = await runCase(tc);
      results.push(r);
      if (!JSON_MODE) printResult(r, tc, VERBOSE);
    } catch (e) {
      if (!JSON_MODE) console.log(`\n⚠️  "${tc.query}" — ${(e as Error).message}`);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  const summary = buildSummary(results, cases);

  if (!JSON_MODE) {
    console.log(`\n${'═'.repeat(72)}`);
    console.log(`RESULTS  threshold=${COMPOSITE_THRESHOLD}  floor=${MIN_VEC_FLOOR}`);
    console.log(`  Pass rate   ${summary.passed}/${summary.total}  (${Math.round(summary.passRate * 100)}%)`);
    console.log(`  Avg MRR     ${f(summary.avgMRR)}  (1.0 = expected result always #1)`);
    console.log(`  Polluted    ${summary.pollutedCount}/${summary.total}  (queries returning wrong types)`);
    console.log(`\n  By tier:`);
    for (const [tier, s] of Object.entries(summary.byTier)) {
      console.log(`    ${tier.padEnd(12)} ${s.passed}/${s.total} (${Math.round(s.passRate * 100)}%)  bad_in_top10=${s.bad_in_top_10_count}`);
    }
    console.log(`${'═'.repeat(72)}\n`);

    const failed = results.filter(r => !r.pass);
    if (failed.length > 0 || CI_MODE) {
      console.log('FAILURES:');
      for (const r of failed) {
        const parts: string[] = [];
        if (r.missed.length)   parts.push(`MISSING: ${r.missed.join(', ')}`);
        if (r.polluted.length) parts.push(`POLLUTANTS: ${r.polluted.join(', ')}`);
        if (r.minResultsFail)  parts.push(`MIN RESULTS: 0 returned`);
        if (!parts.length)     parts.push(`MRR miss (rank ${r.mrr ? Math.round(1 / r.mrr) : '>50'})`);
        console.log(`  [${r.tier}] "${r.query}" — ${parts.join(' | ')}`);
      }
      console.log('');
    }
  }

  if (MILESTONE) {
    const gitSha = (() => {
      try { return require('child_process').execSync('git rev-parse --short HEAD').toString().trim(); }
      catch { return 'unknown'; }
    })();
    const report: BaselineReport = {
      milestone: MILESTONE,
      date: new Date().toISOString(),
      pipeline: PIPELINE === 'v1-full' ? 'v1' : 'v1',
      golden_set_version: String(CASES.length),
      summary,
      cases: results,
    };
    writeBaseline(report, MILESTONE);
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ summary, cases: results }, null, 2) + '\n');
  }

  if (CI_MODE) {
    // Regression tier: any pollutant or minResults failure is a hard block
    const regResults = results.filter(r => r.tier === 'regression');
    const regFails   = regResults.filter(r => !r.pass);
    if (regFails.length > 0) {
      console.error(`\nCI FAIL: ${regFails.length} regression-tier case(s) failed:`);
      for (const r of regFails) {
        console.error(`  "${r.query}" — pollutants: [${r.polluted.join(', ')}] missed: [${r.missed.join(', ')}]`);
      }
      process.exit(1);
    }
    // Overall 70% floor (non-regression cases)
    if (summary.passRate < 0.70) {
      console.error(`\nCI FAIL: overall pass rate ${Math.round(summary.passRate * 100)}% is below 70% threshold.`);
      process.exit(1);
    }
    console.log(`\nCI PASS: ${summary.passed}/${summary.total} cases passed (${Math.round(summary.passRate * 100)}%), regression tier ${regResults.length > 0 ? '100%' : 'N/A'}.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
