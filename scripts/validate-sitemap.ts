#!/usr/bin/env npx tsx
/**
 * Validate sitemap.xml structure and (optionally) live URL health.
 *
 * Usage:
 *   npx tsx scripts/validate-sitemap.ts
 *   npx tsx scripts/validate-sitemap.ts --live
 *   SITEMAP_URL=https://whereto30a.com/sitemap.xml npx tsx scripts/validate-sitemap.ts --live --max=50
 */
import {
  checkSitemapUrlLive,
  collectSitemapPageUrls,
  parseSitemapLocs,
  validateSitemapStructure,
  type SitemapRuleViolation,
} from "../lib/seo/validate-sitemap-urls";

function siteBaseFromSitemapUrl(sitemapUrl: string): string {
  const u = new URL(sitemapUrl);
  return `${u.protocol}//${u.host}`;
}

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const maxArg = args.find((a) => a.startsWith("--max="));
  const maxLive = maxArg ? Number.parseInt(maxArg.split("=")[1] ?? "0", 10) : 0;

  const sitemapUrl =
    process.env.SITEMAP_URL?.trim() ||
    (process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/sitemap.xml`
      : "http://localhost:3000/sitemap.xml");

  console.log(`Fetching ${sitemapUrl}`);
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    console.error(`Failed to fetch sitemap: HTTP ${res.status}`);
    process.exit(1);
  }

  const xml = await res.text();
  const base = siteBaseFromSitemapUrl(sitemapUrl);
  const urls = parseSitemapLocs(xml);
  console.log(`Found ${urls.length} URLs`);
  const violations: SitemapRuleViolation[] = validateSitemapStructure(base, urls);

  if (violations.length > 0) {
    console.error("\nStructure violations:");
    for (const v of violations) {
      console.error(`  [${v.rule}] ${v.detail}${v.url ? ` — ${v.url}` : ""}`);
    }
  } else {
    console.log("Structure checks: OK");
  }

  if (live) {
    const pageUrls = await collectSitemapPageUrls(sitemapUrl);
    const toCheck = maxLive > 0 ? pageUrls.slice(0, maxLive) : pageUrls;
    console.log(`\nLive checks (${toCheck.length} URLs)...`);
    const failures: Awaited<ReturnType<typeof checkSitemapUrlLive>>[] = [];
    for (const url of toCheck) {
      const result = await checkSitemapUrlLive(url);
      if (!result.ok) failures.push(result);
    }
    if (failures.length > 0) {
      console.error("\nLive check failures:");
      for (const f of failures.slice(0, 20)) {
        console.error(`  ${f.url}: ${f.errors.join("; ")}`);
      }
      if (failures.length > 20) {
        console.error(`  ... and ${failures.length - 20} more`);
      }
    } else {
      console.log("Live checks: OK");
    }

    if (failures.length > 0) {
      process.exit(1);
    }
  }

  if (violations.length > 0) {
    process.exit(1);
  }

  console.log("\nAll sitemap validation checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
