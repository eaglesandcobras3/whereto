/**
 * Calibrate IRSE against Google Search Console URL Inspection labels.
 *
 * Usage:
 *   npm run calibrate:irse
 *   npm run calibrate:irse -- --sample-size=100 --force-inspect
 *   npm run calibrate:irse -- --kinds=business,guide
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { calibrateIrse } from "../lib/irse/calibrate";
import { isPageKind, type PageKind } from "../lib/irse/types";
import { getSupabaseSecretKey } from "../lib/supabase/env-keys";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function parseArgs(argv: string[]) {
  let sampleSize = 100;
  let forceInspect = false;
  let maxInspections = 120;
  let kinds: PageKind[] | undefined;

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
    }
  }

  return { sampleSize, forceInspect, maxInspections, kinds };
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createScriptSupabase();

  console.log("IRSE calibration starting…", opts);
  const report = await calibrateIrse(supabase, opts);

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
    for (const w of report.warnings.slice(0, 20)) console.log(`  - ${w}`);
  }

  if (!report.gscConfigured && report.labeled === 0) {
    console.warn(
      "\nNo labeled rows. Configure GSC env vars or pre-populate gsc_url_inspections.",
    );
    process.exit(0);
  }

  if (report.labeled > 0 && !report.meetsFloor) {
    console.error("\nCalibration separation below floor — review weights in lib/irse/weights.ts");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
