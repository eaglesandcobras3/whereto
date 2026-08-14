/**
 * Replace storefront map_lat/map_lng from the US Census geocoder.
 * Public-domain coordinates; safe to store and show on OSM. Overwrites
 * existing pins by default (directory coords were LLM-invented). Service-only
 * rows are skipped. Unconfirmed/closed Gemini audit rows are skipped.
 *
 * Usage:
 *   npx tsx scripts/geocode-businesses-census.ts --file docs/businesses-audit-gemini.csv
 *   npx tsx scripts/geocode-businesses-census.ts --file docs/businesses-audit-gemini.csv --keep-existing-pins
 */

import { readFileSync, writeFileSync } from "fs";
import * as dotenv from "dotenv";
import {
  censusAddressQuery,
  parseCensusGeocodeResponse,
  shouldGeocodeRow,
} from "../lib/directory-audit/census-geocode";
import { parseCsv, stringifyCsv, type CsvRow } from "../lib/directory-audit/csv";
import { OUTPUT_HEADERS } from "../lib/directory-audit/types";

dotenv.config({ path: ".env.local" });

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const FILE = argValue("--file") ?? "docs/businesses-audit-gemini.csv";
// Default overwrite: existing pins in the export were often LLM-invented.
const OVERWRITE = !process.argv.includes("--keep-existing-pins");
const DELAY_MS = Math.max(0, Number(argValue("--delay-ms") ?? "350") || 0);
const USER_AGENT = "WhereTo30A/1.0 (directory audit; https://whereto30a.com)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Census HTTP ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  const match = parseCensusGeocodeResponse(json);
  if (!match) return null;
  return { lat: match.lat, lng: match.lng };
}

async function main() {
  const rows = parseCsv(readFileSync(FILE, "utf8"));
  const headers = Object.keys(rows[0] ?? {}).length ? Object.keys(rows[0] ?? {}) : [...OUTPUT_HEADERS];
  let filled = 0;
  let skipped = 0;
  let missed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!shouldGeocodeRow(row, OVERWRITE)) {
      skipped += 1;
      continue;
    }
    const query = censusAddressQuery(row.location, row.town);
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.title} … `);
    try {
      const match = await geocodeAddress(query);
      if (!match) {
        console.log("no match");
        missed += 1;
      } else {
        row.map_lat = String(match.lat);
        row.map_lng = String(match.lng);
        filled += 1;
        console.log(`${match.lat},${match.lng}`);
      }
    } catch (err) {
      missed += 1;
      console.log(err instanceof Error ? err.message : String(err));
    }
    if (DELAY_MS) await sleep(DELAY_MS);
  }

  writeFileSync(FILE, stringifyCsv(headers, rows), "utf8");
  console.log(
    `\nGeocoded ${filled}, skipped ${skipped}, no match/error ${missed}  [${OVERWRITE ? "overwrite" : "fill blanks only"}]`,
  );
  console.log(`Wrote ${FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
