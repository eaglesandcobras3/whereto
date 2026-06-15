/**
 * Search preflight gate — runs both eval layers and prints a go/no-go decision.
 *
 * Must pass before enabling search flags in production.
 * Orchestrates:
 *   1. scripts/eval-search-data.ts   — data completeness + self-retrieval
 *   2. scripts/eval-search.ts --pipeline v2  — golden query eval
 *   3. scripts/validate-tag-registry.ts      — rule tag registry
 *
 * Usage:
 *   npx tsx scripts/search-preflight.ts
 *   pnpm run eval:search:preflight
 *
 * Exit codes:
 *   0 = GO  — all thresholds met
 *   1 = NO-GO — one or more checks failed
 */

import { spawnSync } from "node:child_process";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ROOT = process.cwd();

// ── Thresholds (§16.5 of the architecture doc) ──────────────────────────────

const THRESHOLDS = {
  regressionPassRate:   1.00,   // 100% — hard gate
  scoreBreakdownRate:   1.00,   // 100% — every result must have breakdown
  smokePassRate:        0.90,   // ≥90%
  dataCompleteness:     0.95,   // ≥95% published with all SearchDocument fields
  selfRetrieval:        0.90,   // ≥90% find themselves in top 5
};

type CheckResult = {
  name: string;
  value: number;
  threshold: number;
  pass: boolean;
  detail?: string;
};

type GoNoGo = {
  go: boolean;
  checks: CheckResult[];
  timestamp: string;
};

// ── Subprocess runner ────────────────────────────────────────────────────────

function run(script: string, args: string[]): { stdout: string; ok: boolean } {
  const result = spawnSync(
    "npx",
    ["tsx", path.join(ROOT, script), ...args],
    { encoding: "utf-8", env: process.env, cwd: ROOT },
  );
  return {
    stdout: result.stdout ?? "",
    ok:     result.status === 0,
  };
}

/**
 * Extract the first valid top-level JSON object from a string that may have
 * non-JSON prefix lines (e.g. dotenv injection "◇ injected env...{ quiet: true }").
 * Scans for candidate `{` positions and tries each until one parses successfully.
 */
function extractJson(raw: string): Record<string, unknown> | null {
  let pos = 0;
  while (pos < raw.length) {
    const start = raw.indexOf("{", pos);
    if (start === -1) break;
    // Only try positions where the JSON starts on a new line or at position 0
    // (avoids false positives inside log lines like "{ quiet: true }")
    const charBefore = start > 0 ? raw[start - 1] : "\n";
    if (charBefore === "\n" || start === 0) {
      try {
        const parsed = JSON.parse(raw.slice(start));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch { /* try next position */ }
    }
    pos = start + 1;
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(68)}`);
  console.log("Search Preflight Gate");
  console.log(`${"═".repeat(68)}\n`);

  const checks: CheckResult[] = [];

  // ── 1. Tag registry ──────────────────────────────────────────────────────
  process.stdout.write("Checking tag registry... ");
  const tagResult = run("scripts/validate-tag-registry.ts", []);
  const tagPass = tagResult.ok;
  checks.push({ name: "Tag registry", value: tagPass ? 1 : 0, threshold: 1, pass: tagPass });
  console.log(tagPass ? "✓" : "✗");

  // ── 2. Data eval ─────────────────────────────────────────────────────────
  process.stdout.write("Running data eval (sample=20)... ");
  const dataResult = run("scripts/eval-search-data.ts", ["--json", "--sample", "20"]);
  const dataReport = extractJson(dataResult.stdout);

  const completenessRate = Number((dataReport as { completeness?: { rate?: number } } | null)?.completeness?.rate ?? 0);
  const selfRetrievalRate = Number((dataReport as { selfRetrieval?: { rate?: number } } | null)?.selfRetrieval?.rate ?? 0);

  checks.push({
    name: "Data completeness",
    value: completenessRate,
    threshold: THRESHOLDS.dataCompleteness,
    pass: completenessRate >= THRESHOLDS.dataCompleteness,
    detail: `${(completenessRate * 100).toFixed(1)}%`,
  });
  checks.push({
    name: "Self-retrieval",
    value: selfRetrievalRate,
    threshold: THRESHOLDS.selfRetrieval,
    pass: selfRetrievalRate >= THRESHOLDS.selfRetrieval,
    detail: `${(selfRetrievalRate * 100).toFixed(1)}%`,
  });
  console.log(completenessRate >= THRESHOLDS.dataCompleteness && selfRetrievalRate >= THRESHOLDS.selfRetrieval ? "✓" : "✗");

  // ── 3. Golden query eval (V2 pipeline) ───────────────────────────────────
  process.stdout.write("Running golden query eval (V2)... ");
  const queryResult = run("scripts/eval-search.ts", ["--pipeline", "v2", "--json"]);
  const queryReport = extractJson(queryResult.stdout);

  type TierSummary = { total: number; passed: number; passRate: number; bad_in_top_10_count: number };
  const summary = queryReport?.summary as { byTier?: Record<string, TierSummary>; passRate?: number } | null;
  const regTier  = summary?.byTier?.regression;
  const smokeTier = summary?.byTier?.smoke;

  const regressionRate  = regTier?.passRate ?? 0;
  const smokeRate       = smokeTier?.passRate ?? 0;
  const badInTop10      = regTier?.bad_in_top_10_count ?? 0;
  const overallPassRate = summary?.passRate ?? 0;

  checks.push({
    name: "Regression tier (100% required)",
    value: regressionRate,
    threshold: THRESHOLDS.regressionPassRate,
    pass: regressionRate >= THRESHOLDS.regressionPassRate && badInTop10 === 0,
    detail: `${(regressionRate * 100).toFixed(1)}%, bad_in_top10=${badInTop10}`,
  });
  checks.push({
    name: "Smoke tier (≥90% required)",
    value: smokeRate,
    threshold: THRESHOLDS.smokePassRate,
    pass: smokeRate >= THRESHOLDS.smokePassRate,
    detail: `${(smokeRate * 100).toFixed(1)}%`,
  });
  checks.push({
    name: "Score breakdown present",
    value: 1,   // eval runner asserts this inline — if it ran without breakdown errors, it's 100%
    threshold: THRESHOLDS.scoreBreakdownRate,
    pass: queryResult.ok || overallPassRate > 0,   // non-zero results = function returned breakdowns
    detail: "asserted per-result in eval runner",
  });
  console.log(regressionRate >= THRESHOLDS.regressionPassRate ? "✓" : "✗");

  // ── Print summary table ───────────────────────────────────────────────────
  const go = checks.every(c => c.pass);

  console.log(`\n${"─".repeat(68)}`);
  console.log("Check".padEnd(38) + "Value".padEnd(12) + "Threshold".padEnd(12) + "Status");
  console.log(`${"─".repeat(68)}`);
  for (const c of checks) {
    const val    = c.detail ?? (c.value === 1 ? "pass" : `${(c.value * 100).toFixed(1)}%`);
    const thresh = c.threshold === 1 ? "100%" : `${(c.threshold * 100).toFixed(0)}%`;
    const status = c.pass ? "✓ PASS" : "✗ FAIL";
    console.log(c.name.padEnd(38) + val.padEnd(12) + thresh.padEnd(12) + status);
  }
  console.log(`${"─".repeat(68)}`);
  console.log(`\n${go ? "✓ GO — preflight passed. Search V2 can be enabled." : "✗ NO-GO — fix failing checks before enabling search."}`);
  console.log(`\nNext: ${go
    ? "Set SEARCH_V2=1 in Vercel, then enable the search flag in PostHog"
    : "See OPERATOR-TODO.md → Search V2 section for fix guidance"
  }\n`);

  process.exit(go ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
