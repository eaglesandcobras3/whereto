/**
 * Calibrate IRSE against labeled pages, or score all published pages for badge snapshots.
 *
 * Score every published page (no GSC; fills irse_score_snapshots for admin badges):
 *   npm run calibrate:irse -- --score-all
 *   npm run calibrate:irse -- --score-all --kinds=business,guide,town,area
 *
 * GSC sample mode (default):
 *   npm run calibrate:irse
 *   npm run calibrate:irse -- --sample-size=100 --force-inspect
 *
 * CSV label mode (no GSC calls):
 *   npm run calibrate:irse -- \
 *     --indexed=docs/irse-indexed.csv \
 *     --not-indexed=docs/irse-notindexed.csv \
 *     --tune-weights
 *   # optional: --apply-weights  writes suggested mix into lib/irse/weights.ts
 *   # optional: --tune-include-categories  (default tunes business/guide/town/area only)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  calibrateIrse,
  calibrateIrseFromLabels,
  scoreAllPublishedPages,
} from "../lib/irse/calibrate";
import { loadAndResolveLabeledRoutesFromCsv } from "../lib/irse/parse-label-csv";
import { buildLabelRouteLookup } from "../lib/irse/resolve-label-route";
import {
  DEFAULT_TUNE_KINDS,
  formatWeightsTsBlock,
  tuneCategoryWeights,
  type WeightTuneResult,
} from "../lib/irse/tune-weights";
import { isPageKind, PAGE_KINDS, type PageKind } from "../lib/irse/types";
import { getSupabaseSecretKey } from "../lib/supabase/env-keys";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function parseArgs(argv: string[]) {
  let sampleSize = 100;
  let forceInspect = false;
  let maxInspections = 120;
  let kinds: PageKind[] | undefined;
  let indexedCsv: string | undefined;
  let notIndexedCsv: string | undefined;
  let tuneWeights = false;
  let applyWeights = false;
  let persist = true;
  let tuneIncludeCategories = false;
  let scoreAll = false;

  for (const arg of argv) {
    if (arg.startsWith("--sample-size=")) {
      sampleSize = Number(arg.slice("--sample-size=".length)) || 100;
    } else if (arg === "--force-inspect") {
      forceInspect = true;
    } else if (arg.startsWith("--max-inspections=")) {
      maxInspections = Number(arg.slice("--max-inspections=".length)) || 120;
    } else if (arg.startsWith("--kinds=")) {
      const raw = arg.slice("--kinds=".length).split(",").map((s) => s.trim());
      kinds = raw.filter((k): k is PageKind => isPageKind(k));
    } else if (arg.startsWith("--indexed=")) {
      indexedCsv = arg.slice("--indexed=".length);
    } else if (arg.startsWith("--not-indexed=")) {
      notIndexedCsv = arg.slice("--not-indexed=".length);
    } else if (arg === "--tune-weights") {
      tuneWeights = true;
    } else if (arg === "--apply-weights") {
      applyWeights = true;
      tuneWeights = true;
    } else if (arg === "--tune-include-categories") {
      tuneIncludeCategories = true;
    } else if (arg === "--no-persist") {
      persist = false;
    } else if (arg === "--score-all") {
      scoreAll = true;
    }
  }

  return {
    sampleSize,
    forceInspect,
    maxInspections,
    kinds,
    indexedCsv,
    notIndexedCsv,
    tuneWeights,
    applyWeights,
    persist,
    tuneIncludeCategories,
    scoreAll,
  };
}

function createScriptSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseSecretKey();
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function applyWeightsToFile(block: string): void {
  const path = join(process.cwd(), "lib/irse/weights.ts");
  const src = readFileSync(path, "utf8");
  const replaced = src.replace(
    /export const CATEGORY_WEIGHTS: CategoryScores = \{[\s\S]*?\};/,
    block,
  );
  if (replaced === src) {
    throw new Error("Could not find CATEGORY_WEIGHTS block in lib/irse/weights.ts");
  }
  writeFileSync(path, replaced, "utf8");
  console.log("\nWrote improved CATEGORY_WEIGHTS → lib/irse/weights.ts");
}

function writeMarkdownReport(
  report: Awaited<ReturnType<typeof calibrateIrseFromLabels>>,
  tune: WeightTuneResult | null,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const outPath = join(process.cwd(), "docs", `irse-calibration-${date}.md`);
  const lines: string[] = [
    `# IRSE calibration ${date}`,
    "",
    `- Labeled: ${report.labeled} (indexed=${report.indexedCount}, not-indexed=${report.notIndexedCount})`,
    `- Indexed mean: ${report.indexedMean ?? "n/a"}`,
    `- Not-indexed mean: ${report.notIndexedMean ?? "n/a"}`,
    `- Separation: ${report.separation ?? "n/a"} (floor ${report.separationFloor}) → ${
      report.meetsFloor ? "PASS" : "BELOW FLOOR"
    }`,
    "",
    "## Histogram",
    "",
  ];
  for (const h of report.histogram) {
    lines.push(`- ${h.bucket}: indexed=${h.indexed} not-indexed=${h.notIndexed}`);
  }
  if (tune) {
    lines.push(
      "",
      "## Weight tuning",
      "",
      `- Tune kinds: ${tune.tuneKinds.join(", ")} (${tune.tuneRowCount} rows; indexed=${tune.tuneIndexedCount}, not-indexed=${tune.tuneNotIndexedCount})`,
      `- Weight box: [${tune.weightMin}, ${tune.weightMax}]`,
      `- Tune-set baseline separation: ${tune.baselineSeparation ?? "n/a"}`,
      `- Tune-set best separation: ${tune.bestSeparation ?? "n/a"}`,
      `- Full-set baseline → best: ${tune.fullSetBaselineSeparation ?? "n/a"} → ${tune.fullSetBestSeparation ?? "n/a"}`,
      `- Improved: ${tune.improved} · recommend apply: ${tune.recommendApply}`,
      "",
    );
    for (const n of tune.notes) lines.push(`- ${n}`);
    lines.push("", "```ts", formatWeightsTsBlock(tune.bestWeights), "```", "");
  }
  if (report.topFlagsAmongNotIndexed.length) {
    lines.push("", "## Top flags among not-indexed", "");
    for (const f of report.topFlagsAmongNotIndexed) {
      lines.push(`- \`${f.code}\`: ${f.count}`);
    }
  }
  mkdirSync(join(process.cwd(), "docs"), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  return outPath;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createScriptSupabase();
  const csvMode = Boolean(opts.indexedCsv || opts.notIndexedCsv);

  if (opts.scoreAll && csvMode) {
    throw new Error("Use either --score-all or CSV labels, not both.");
  }
  if (csvMode && (!opts.indexedCsv || !opts.notIndexedCsv)) {
    throw new Error("CSV mode requires both --indexed=… and --not-indexed=…");
  }

  if (opts.scoreAll) {
    console.log("IRSE score-all starting…", {
      kinds: opts.kinds ?? [...PAGE_KINDS],
      persist: opts.persist,
    });
    const report = await scoreAllPublishedPages(supabase, {
      kinds: opts.kinds,
      persist: opts.persist,
      onProgress: (done, total, path) => {
        if (done === 1 || done === total || done % 25 === 0) {
          console.log(`  [${done}/${total}] ${path}`);
        }
      },
    });
    console.log("\n=== IRSE Score-All Report ===");
    console.log(`Total candidates: ${report.total}`);
    console.log(`Scored: ${report.scored}`);
    console.log(`Failed: ${report.failed}`);
    for (const kind of PAGE_KINDS) {
      const row = report.byKind[kind];
      if (!row.total) continue;
      console.log(
        `  ${kind}: scored=${row.scored} failed=${row.failed} (of ${row.total})`,
      );
    }
    if (report.warnings.length) {
      console.log("\nWarnings:");
      for (const w of report.warnings.slice(0, 40)) console.log(`  - ${w}`);
      if (report.warnings.length > 40) {
        console.log(`  … and ${report.warnings.length - 40} more`);
      }
    }
    if (report.failed > 0 && report.scored === 0) {
      process.exit(1);
    }
    return;
  }

  console.log("IRSE calibration starting…", csvMode ? "CSV labels" : opts);

  let report;
  if (csvMode) {
    const lookup = await buildLabelRouteLookup(supabase);
    const indexed = await loadAndResolveLabeledRoutesFromCsv(
      supabase,
      opts.indexedCsv!,
      true,
      lookup,
    );
    const notIndexed = await loadAndResolveLabeledRoutesFromCsv(
      supabase,
      opts.notIndexedCsv!,
      false,
      lookup,
    );
    const routes = [...indexed.routes, ...notIndexed.routes];
    const warnings = [...indexed.warnings, ...notIndexed.warnings];
    console.log(
      `Loaded ${indexed.routes.length} indexed + ${notIndexed.routes.length} not-indexed routes`,
    );
    console.log(
      `Resolved aliases: indexed=${indexed.resolvedAliases}, not-indexed=${notIndexed.resolvedAliases}`,
    );
    const aliasExamples = [...indexed.routes, ...notIndexed.routes]
      .filter((r) => r.via)
      .slice(0, 12);
    if (aliasExamples.length) {
      console.log("Alias examples:");
      for (const r of aliasExamples) {
        console.log(`  ${r.source} → ${r.kind}/${r.slug} (${r.via})`);
      }
    }
    report = await calibrateIrseFromLabels(supabase, {
      routes,
      persist: opts.persist,
    });
    report.warnings = [...warnings, ...report.warnings];
  } else {
    report = await calibrateIrse(supabase, opts);
  }

  console.log("\n=== IRSE Calibration Report ===");
  console.log(`GSC configured: ${report.gscConfigured}`);
  console.log(
    `Labeled: ${report.labeled} (indexed=${report.indexedCount}, not-indexed=${report.notIndexedCount})`,
  );
  console.log(`Indexed mean: ${report.indexedMean ?? "n/a"}`);
  console.log(`Not-indexed mean: ${report.notIndexedMean ?? "n/a"}`);
  console.log(
    `Separation: ${report.separation ?? "n/a"} (floor ${report.separationFloor}) → ${
      report.meetsFloor ? "PASS" : "BELOW FLOOR"
    }`,
  );

  console.log("\nHistogram:");
  for (const h of report.histogram) {
    console.log(`  ${h.bucket}: indexed=${h.indexed} not-indexed=${h.notIndexed}`);
  }

  if (report.topFlagsAmongNotIndexed.length) {
    console.log("\nTop flags among not-indexed:");
    for (const f of report.topFlagsAmongNotIndexed) {
      console.log(`  ${f.code}: ${f.count}`);
    }
  }

  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const w of report.warnings.slice(0, 40)) console.log(`  - ${w}`);
  }

  let tune: WeightTuneResult | null = null;
  if (opts.tuneWeights) {
    if (report.rows.length < 4) {
      console.warn("\nNot enough scored rows to tune weights (need several in each class).");
    } else {
      const tuneKinds = opts.tuneIncludeCategories
        ? [...PAGE_KINDS]
        : [...DEFAULT_TUNE_KINDS];
      tune = tuneCategoryWeights(
        report.rows.map((r) => ({
          indexed: r.indexed,
          scores: r.scores,
          kind: r.kind,
        })),
        { kinds: tuneKinds },
      );
      console.log("\n=== Weight tuning ===");
      for (const n of tune.notes) console.log(`  ${n}`);
      console.log(
        `Tune set: ${tune.tuneRowCount} rows (indexed=${tune.tuneIndexedCount}, not-indexed=${tune.tuneNotIndexedCount})`,
      );
      console.log(
        `Tune-set baseline separation: ${tune.baselineSeparation ?? "n/a"} (indexed ${tune.baselineIndexedMean} / not ${tune.baselineNotIndexedMean})`,
      );
      console.log(
        `Tune-set best separation: ${tune.bestSeparation ?? "n/a"} (indexed ${tune.bestIndexedMean} / not ${tune.bestNotIndexedMean})`,
      );
      console.log(
        `Full-set validation: ${tune.fullSetBaselineSeparation ?? "n/a"} → ${tune.fullSetBestSeparation ?? "n/a"}`,
      );
      console.log(
        `Improved: ${tune.improved} · recommend apply: ${tune.recommendApply} · meets floor: ${tune.meetsFloor}`,
      );
      console.log("\nSuggested CATEGORY_WEIGHTS:\n");
      console.log(formatWeightsTsBlock(tune.bestWeights));

      if (opts.applyWeights && tune.recommendApply) {
        applyWeightsToFile(formatWeightsTsBlock(tune.bestWeights));
      } else if (opts.applyWeights && !tune.recommendApply) {
        console.warn(
          "\n--apply-weights skipped: tuner does not recommend apply (weak improvement or full-set regression).",
        );
      }
    }
  }

  if (csvMode) {
    const md = writeMarkdownReport(report, tune);
    console.log(`\nReport written: ${md}`);
  }

  if (!csvMode && !report.gscConfigured && report.labeled === 0) {
    console.warn(
      "\nNo labeled rows. Pass --indexed / --not-indexed CSVs, or configure GSC / gsc_url_inspections.",
    );
    process.exit(0);
  }

  // Pass/fail on the full labeled calibration — not the weight-tune subset.
  if (report.labeled > 0 && report.separation != null && report.separation < report.separationFloor) {
    console.error(
      "\nCalibration separation below floor — review category checks or supply more labels.",
    );
    process.exit(1);
  }

  if (tune && tune.tuneIndexedCount > 0 && tune.tuneNotIndexedCount > 0) {
    if ((tune.baselineSeparation ?? 0) < 5) {
      console.warn(
        "\nNote: on business/guide/town/area alone, indexed vs not-indexed scores are nearly tied.",
      );
      console.warn(
        "Full-set separation is mostly from thin category hubs in not-indexed. Add more entity-page labels (or improve entity scorers) before applying weight changes.",
      );
    }
    if (!tune.recommendApply) {
      console.log("\nCalibration PASS — no weight change recommended.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
