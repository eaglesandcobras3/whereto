#!/usr/bin/env npx tsx
/**
 * Run a full SEO site audit locally or against production.
 *
 * Usage:
 *   npm run audit:seo
 *   npm run audit:seo -- --live
 *   npm run audit:seo -- --live --max-urls=100
 *   npm run audit:seo -- --out docs/seo-audit-report.md
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { runSiteAuditWithMarkdown } from "../lib/seo/site-audit/run-audit";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const maxArg = args.find((a) => a.startsWith("--max-urls="));
  const maxUrls = maxArg ? Number.parseInt(maxArg.split("=")[1] ?? "0", 10) : 2500;
  const outArg = args.find((a) => a.startsWith("--out="));
  const outPath = outArg?.split("=")[1];

  const baseUrl = (
    live
      ? process.env.NEXT_PUBLIC_SITE_URL || "https://whereto30a.com"
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabase =
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
      : null;

  console.log(`SEO audit: ${baseUrl}`);
  const { report, markdown } = await runSiteAuditWithMarkdown({
    baseUrl,
    supabase,
    maxUrls: Number.isFinite(maxUrls) && maxUrls > 0 ? maxUrls : 2500,
    concurrency: 8,
    maxDepth: 2,
    onProgress: (done, total) => {
      if (done % 25 === 0 || done === total) {
        console.log(`  crawled ${done}/${total}`);
      }
    },
  });

  console.log("\n--- Summary ---");
  console.log(`URLs crawled: ${report.summary.urlsCrawled}`);
  console.log(`Errors: ${report.summary.issueCounts.error ?? 0}`);
  console.log(`Warnings: ${report.summary.issueCounts.warning ?? 0}`);
  console.log(`Notices: ${report.summary.issueCounts.notice ?? 0}`);
  console.log(`Duration: ${(report.summary.durationMs / 1000).toFixed(1)}s`);

  const target =
    outPath ??
    join(process.cwd(), "docs", `seo-audit-report-${new Date().toISOString().slice(0, 10)}.md`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, markdown, "utf8");
  console.log(`\nReport written: ${target}`);

  if ((report.summary.issueCounts.error ?? 0) > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
