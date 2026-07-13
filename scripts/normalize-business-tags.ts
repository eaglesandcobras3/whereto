/**
 * Deterministic tag/business_type cleanup for the audit CSVs produced by
 * scripts/export-businesses-csv.ts. No network or LLM calls — every mapping
 * is a hand-built rule in scripts/lib/tag-vocabulary.ts.
 *
 * For each of item_tags/dietary_tags/meal_period_tags/atmosphere_tags/occasion_tags:
 *   normalizeSlug -> exact canonical match -> synonym map -> keyword regex -> drop (logged)
 * For business_type: exact canonical match -> synonym map -> left as-is (flagged)
 * For search_profile: strips a leading keyword-soup line when followed by a
 * blank line and a real narrative paragraph (the two are concatenated as
 * leftover cruft from earlier enrichment); nothing else is rewritten.
 *
 * Usage:
 *   npx tsx scripts/normalize-business-tags.ts                 # both files
 *   npx tsx scripts/normalize-business-tags.ts --file docs/storefronts-audit.csv
 *
 * Overwrites the input CSV in place. A `<file>.pre-cleanup.csv` backup of the
 * original is written first (only if one doesn't already exist), and a
 * docs/tag-cleanup-report.md summarizes every drop/flag for review.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import {
  CANONICAL_TAG_SET,
  CANONICAL_BUSINESS_TYPE_SET,
  TAG_SYNONYMS,
  TAG_KEYWORD_RULES,
  BUSINESS_TYPE_SYNONYMS,
  normalizeSlug,
} from "./lib/tag-vocabulary";

/** occasion_tags should only ever hold true occasion/vibe tags — everything else
 * (item categories, service verticals) that leaked in from earlier bad imports gets dropped. */
const TRUE_OCCASION_TAGS = new Set([
  "family_outing", "date_night", "girls_trip", "special_occasion", "celebration",
  "rainy_day", "quick_bite", "souvenir_shopping", "gift_shopping", "tourist_attraction",
  "locals_favorite", "self_care", "solo",
]);

/** Tags that only make sense for an actual service business, not a retail/food/lodging storefront. */
const SERVICE_VERTICAL_TAGS = new Set([
  "fitness_classes", "wellness", "salon_services", "nail_services", "spa_services", "massage",
  "skincare", "dental_care", "dermatology", "chiropractic_care", "counseling", "medical_care",
  "healthcare", "hospice_rehab_care", "veterinary_care", "hvac_repair", "plumbing", "electrical",
  "roofing", "pest_control", "landscaping", "lawn_care", "cleaning_services", "handyman",
  "home_improvement", "window_treatments", "cabinetry", "flooring", "painting", "home_inspection",
  "security_systems", "restoration", "contractors", "insurance", "accounting", "tax_prep",
  "bookkeeping", "financial_planning", "legal_services", "real_estate", "title_escrow",
  "property_management",
]);

/** Categories where SERVICE_VERTICAL_TAGS never belong (retail/food/lodging/activities). */
const RETAIL_FOOD_CATEGORY_SLUGS = new Set([
  "restaurants", "bars", "coffee_shops", "boutiques", "shopping", "specialty_retail",
  "jewelry", "footwear", "ice_cream", "candy_sweets", "donut_shops", "desserts", "hotels",
  "activities", "entertainment",
]);

const TAG_FIELDS = [
  "item_tags",
  "dietary_tags",
  "meal_period_tags",
  "atmosphere_tags",
  "occasion_tags",
] as const;

const DEFAULT_FILES = ["docs/storefronts-audit.csv", "docs/services-audit.csv"];

type CsvRow = Record<string, string>;

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  const [header, ...body] = rows;
  return {
    headers: header.map((h) => h.trim()),
    rows: body.map((cells) => Object.fromEntries(header.map((h, idx) => [h.trim(), cells[idx] ?? ""]))),
  };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function stringifyCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function parseTagArray(raw: string): string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

type NormalizeResult = { kept: string[]; dropped: string[] };

function normalizeTagList(raw: string): NormalizeResult {
  const tags = parseTagArray(raw);
  const kept = new Set<string>();
  const dropped: string[] = [];

  for (const tag of tags) {
    const original = tag.trim();
    if (!original) continue;
    const slug = normalizeSlug(original);
    if (!slug) continue;

    if (CANONICAL_TAG_SET.has(slug)) {
      kept.add(slug);
      continue;
    }
    if (TAG_SYNONYMS[slug]) {
      kept.add(TAG_SYNONYMS[slug]);
      continue;
    }
    const rule = TAG_KEYWORD_RULES.find((r) => r.pattern.test(original));
    if (rule) {
      kept.add(rule.tag);
      continue;
    }
    dropped.push(original);
  }

  return { kept: [...kept].sort(), dropped };
}

type BusinessTypeResult = { value: string; mapped: boolean };

function normalizeBusinessType(raw: string): BusinessTypeResult {
  const original = raw.trim();
  if (!original) return { value: original, mapped: true };
  const lower = original.toLowerCase();
  if (CANONICAL_BUSINESS_TYPE_SET.has(lower)) return { value: lower, mapped: true };

  const slug = normalizeSlug(original);
  const synonym = BUSINESS_TYPE_SYNONYMS[slug];
  if (synonym) return { value: synonym, mapped: true };

  return { value: original, mapped: false };
}

/**
 * Strips a leading keyword-soup line from search_profile when it's followed
 * by a blank line and a real narrative paragraph — leftover cruft from an
 * earlier enrichment pass that prefixed a comma-separated keyword dump before
 * the actual written profile. Only strips when confident; otherwise flags.
 */
function cleanSearchProfile(raw: string): { value: string; stripped: boolean; flagged: boolean } {
  const profile = raw ?? "";
  if (!profile.includes("\n\n")) {
    return { value: profile, stripped: false, flagged: isKeywordSoup(profile) };
  }
  const idx = profile.indexOf("\n\n");
  const first = profile.slice(0, idx);
  const rest = profile.slice(idx + 2).trim();
  const commas = (first.match(/,/g) ?? []).length;
  const hasSentence = /\.\s/.test(first) || /\.$/.test(first.trim());
  if (rest && commas >= 3 && !hasSentence) {
    return { value: rest, stripped: true, flagged: false };
  }
  return { value: profile, stripped: false, flagged: isKeywordSoup(profile) };
}

function isKeywordSoup(profile: string): boolean {
  const trimmed = profile.trim();
  if (!trimmed) return false;
  const commas = (trimmed.match(/,/g) ?? []).length;
  const hasSentence = /\.\s/.test(trimmed) || /\.$/.test(trimmed);
  return commas >= 4 && !hasSentence;
}

type FileReport = {
  file: string;
  rowCount: number;
  droppedTags: Map<string, Set<string>>; // tag -> business titles
  unmappedBusinessTypes: Map<string, string[]>; // business_type -> business titles
  strippedProfiles: string[];
  flaggedProfiles: string[];
};

function processFile(path: string): FileReport {
  const original = readFileSync(path, "utf8");
  const backupPath = path.replace(/\.csv$/i, ".pre-cleanup.csv");
  if (!existsSync(backupPath)) {
    writeFileSync(backupPath, original, "utf8");
  }

  const { headers, rows } = parseCsv(original);
  const report: FileReport = {
    file: path,
    rowCount: rows.length,
    droppedTags: new Map(),
    unmappedBusinessTypes: new Map(),
    strippedProfiles: [],
    flaggedProfiles: [],
  };

  for (const row of rows) {
    const title = row.title || row.slug || "(untitled)";

    const isRetailFood = RETAIL_FOOD_CATEGORY_SLUGS.has(row.primary_category ?? "");

    for (const field of TAG_FIELDS) {
      if (row[field] === undefined) continue;
      const { kept, dropped } = normalizeTagList(row[field]);
      let final = kept;

      if (field === "occasion_tags") {
        final = final.filter((t) => TRUE_OCCASION_TAGS.has(t));
      }
      if (isRetailFood) {
        final = final.filter((t) => !SERVICE_VERTICAL_TAGS.has(t));
      }

      row[field] = JSON.stringify(final);
      for (const tag of dropped) {
        if (!report.droppedTags.has(tag)) report.droppedTags.set(tag, new Set());
        report.droppedTags.get(tag)!.add(title);
      }
    }

    if (row.business_type !== undefined && row.business_type.trim()) {
      const { value, mapped } = normalizeBusinessType(row.business_type);
      row.business_type = value;
      if (!mapped) {
        if (!report.unmappedBusinessTypes.has(value)) report.unmappedBusinessTypes.set(value, []);
        report.unmappedBusinessTypes.get(value)!.push(title);
      }
    }

    if (row.search_profile !== undefined && row.search_profile.trim()) {
      const { value, stripped, flagged } = cleanSearchProfile(row.search_profile);
      row.search_profile = value;
      if (stripped) report.strippedProfiles.push(title);
      if (flagged) report.flaggedProfiles.push(title);
    }
  }

  writeFileSync(path, stringifyCsv(headers, rows), "utf8");
  return report;
}

function writeReport(reports: FileReport[]) {
  const lines: string[] = [
    "# Tag cleanup report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Deterministic pass by `scripts/normalize-business-tags.ts` — no LLM calls.",
    "Originals backed up alongside each source file as `<file>.pre-cleanup.csv`.",
    "",
  ];

  for (const r of reports) {
    lines.push(`## ${r.file}`, "", `Rows processed: ${r.rowCount}`, "");

    const droppedEntries = [...r.droppedTags.entries()].sort((a, b) => b[1].size - a[1].size);
    lines.push(`### Dropped tags (${droppedEntries.length} distinct, no canonical/keyword match)`, "");
    if (droppedEntries.length === 0) {
      lines.push("None.", "");
    } else {
      lines.push("| Tag | Businesses |", "| --- | --- |");
      for (const [tag, titles] of droppedEntries) {
        lines.push(`| \`${tag}\` | ${[...titles].join(", ").replace(/\|/g, "\\|")} |`);
      }
      lines.push("");
    }

    const unmappedBt = [...r.unmappedBusinessTypes.entries()].sort((a, b) => b[1].length - a[1].length);
    lines.push(`### business_type values needing a manual pick (${unmappedBt.length})`, "");
    if (unmappedBt.length === 0) {
      lines.push("None.", "");
    } else {
      lines.push("| business_type | Businesses |", "| --- | --- |");
      for (const [bt, titles] of unmappedBt) {
        lines.push(`| \`${bt}\` | ${titles.join(", ").replace(/\|/g, "\\|")} |`);
      }
      lines.push("");
    }

    lines.push(
      `### search_profile: keyword-soup prefix stripped automatically (${r.strippedProfiles.length})`,
      "",
      r.strippedProfiles.length ? r.strippedProfiles.map((t) => `- ${t}`).join("\n") : "None.",
      "",
    );

    lines.push(
      `### search_profile: still looks like keyword soup — needs a manual rewrite (${r.flaggedProfiles.length})`,
      "",
      r.flaggedProfiles.length ? r.flaggedProfiles.map((t) => `- ${t}`).join("\n") : "None.",
      "",
    );
  }

  writeFileSync("docs/tag-cleanup-report.md", lines.join("\n") + "\n", "utf8");
}

function main() {
  const fileIdx = process.argv.indexOf("--file");
  const files = fileIdx >= 0 ? [process.argv[fileIdx + 1]] : DEFAULT_FILES;

  const reports = files.filter(Boolean).map((f) => {
    console.log(`Processing ${f}...`);
    const report = processFile(f as string);
    console.log(
      `  dropped tags: ${report.droppedTags.size} distinct, ` +
        `unmapped business_type: ${report.unmappedBusinessTypes.size}, ` +
        `profiles stripped: ${report.strippedProfiles.length}, ` +
        `profiles flagged: ${report.flaggedProfiles.length}`,
    );
    return report;
  });

  writeReport(reports);
  console.log("\nWrote docs/tag-cleanup-report.md");
}

main();
