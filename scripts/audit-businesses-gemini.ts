/**
 * Verify directory listings with Gemini + Google Search grounding, then rewrite
 * short directory copy. Writes an import-compatible CSV. Does not write coordinates
 * (use geocode-businesses-census.ts) and does not update Supabase.
 *
 * Verified listings are copied through unchanged. Unconfirmed/closed rows keep
 * their original content fields so you can review before import.
 *
 * Usage:
 *   npx tsx scripts/audit-businesses-gemini.ts --limit 5
 *   npx tsx scripts/audit-businesses-gemini.ts
 *   npx tsx scripts/audit-businesses-gemini.ts --file docs/businesses-audit.csv --out docs/businesses-audit-gemini.csv
 *   npx tsx scripts/audit-businesses-gemini.ts --id <uuid>
 *
 * Resumes by default (skips rows already in --out with a terminal audit_status).
 * Pass --force to redo everything except verified listings.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import * as dotenv from "dotenv";
import { buildGeminiAuditPrompt } from "../lib/directory-audit/build-audit-prompt";
import { parseCsv, stringifyCsv, type CsvRow } from "../lib/directory-audit/csv";
import {
  errorAuditRow,
  mergeAuditRow,
  skippedVerifiedRow,
  uniqueNonEmpty,
} from "../lib/directory-audit/merge-audit-row";
import {
  firstCandidateText,
  groundingSourceUrls,
  hadGoogleSearch,
  parseGeminiAuditProposal,
} from "../lib/directory-audit/parse-model-json";
import {
  OUTPUT_HEADERS,
  TERMINAL_AUDIT_STATUSES,
  type AllowedVocab,
} from "../lib/directory-audit/types";

dotenv.config({ path: ".env.local" });

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const INPUT_PATH = argValue("--file") ?? "docs/businesses-audit.csv";
const OUTPUT_PATH = argValue("--out") ?? "docs/businesses-audit-gemini.csv";
const LIMIT_RAW = argValue("--limit");
const LIMIT = LIMIT_RAW ? Math.max(1, Number(LIMIT_RAW) || 0) : null;
const SINGLE_ID = argValue("--id");
const FORCE = hasFlag("--force");
const DELAY_MS = Math.max(0, Number(argValue("--delay-ms") ?? "400") || 0);
const MODEL = argValue("--model") ?? process.env.GEMINI_MODEL?.trim() ?? "gemini-3.7-flash";
const API_KEY =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
  "";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadPrior(path: string): Map<string, CsvRow> {
  if (!existsSync(path)) return new Map();
  const rows = parseCsv(readFileSync(path, "utf8"));
  const map = new Map<string, CsvRow>();
  for (const row of rows) {
    const id = row.id?.trim();
    if (id) map.set(id, row);
  }
  return map;
}

type GeminiResponse = Record<string, unknown>;

async function generateContent(prompt: string): Promise<GeminiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      // Do not set thinkingBudget: 0 — that prevents Google Search grounding on Gemini 3.x.
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  });

  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    const err = json.error as { message?: string; status?: string } | undefined;
    const message = err?.message || res.statusText || `HTTP ${res.status}`;
    const error = new Error(message) as Error & { status?: number; apiStatus?: string };
    error.status = res.status;
    error.apiStatus = err?.status;
    throw error;
  }
  return json;
}

async function auditOne(row: CsvRow, allowed: AllowedVocab, allowedLists: {
  towns: string[];
  areas: string[];
  categories: string[];
}): Promise<CsvRow> {
  if (row.is_verified === "true") return skippedVerifiedRow(row);

  const basePrompt = buildGeminiAuditPrompt(row, allowedLists);
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nAttempt ${attempt}: You MUST use Google Search again. Write research bullets, then the JSON code block.`;
    try {
      const payload = await generateContent(prompt);
      if (!hadGoogleSearch(payload)) {
        lastError = "Gemini did not run Google Search";
        continue;
      }
      const text = firstCandidateText(payload);
      const proposal = parseGeminiAuditProposal(text);
      return mergeAuditRow(row, proposal, allowed, groundingSourceUrls(payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = message;
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 503) {
        await sleep(2000 * attempt);
      }
    }
  }

  return errorAuditRow(row, lastError);
}

async function main() {
  if (!API_KEY) {
    console.error("Missing GEMINI_API_KEY in .env.local");
    process.exit(1);
  }
  if (!existsSync(INPUT_PATH)) {
    console.error(`Input CSV not found: ${INPUT_PATH}`);
    console.error("Export first: npx tsx scripts/export-businesses-csv.ts");
    process.exit(1);
  }

  const inputRows = parseCsv(readFileSync(INPUT_PATH, "utf8"));
  const allowed: AllowedVocab = {
    towns: uniqueNonEmpty(inputRows.map((r) => r.town ?? "")),
    areas: uniqueNonEmpty(inputRows.map((r) => r.area ?? "")),
    categories: uniqueNonEmpty(inputRows.map((r) => r.category ?? "")),
  };
  const allowedLists = {
    towns: [...allowed.towns].sort(),
    areas: [...allowed.areas].sort(),
    categories: [...allowed.categories].sort(),
  };

  const prior = FORCE ? new Map<string, CsvRow>() : loadPrior(OUTPUT_PATH);
  const outById = new Map(prior);
  const queued = inputRows.filter((row) => {
    if (SINGLE_ID && row.id !== SINGLE_ID) return false;
    const existing = prior.get(row.id);
    if (existing && TERMINAL_AUDIT_STATUSES.has(existing.audit_status ?? "")) return false;
    return true;
  });
  const work = LIMIT ? queued.slice(0, LIMIT) : queued;

  console.log(`Gemini directory audit  model=${MODEL}`);
  console.log(`Input: ${INPUT_PATH} (${inputRows.length} rows)`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Queued: ${work.length}  already done: ${inputRows.length - queued.length}`);

  function writeSnapshot() {
    const rows = inputRows.map((row) => outById.get(row.id) ?? row);
    writeFileSync(OUTPUT_PATH, stringifyCsv(OUTPUT_HEADERS, rows), "utf8");
  }

  for (let i = 0; i < work.length; i++) {
    const row = work[i];
    process.stdout.write(`[${i + 1}/${work.length}] ${row.title} … `);
    const result = await auditOne(row, allowed, allowedLists);
    outById.set(row.id, result);
    console.log(result.audit_status);
    writeSnapshot();
    if (DELAY_MS && i < work.length - 1) await sleep(DELAY_MS);
  }

  writeSnapshot();

  const counts = {
    exists: 0,
    closed: 0,
    cannot_confirm: 0,
    skipped_verified: 0,
    error: 0,
    pending: 0,
  };
  for (const row of inputRows.map((r) => outById.get(r.id) ?? r)) {
    const status = row.audit_status as keyof typeof counts | undefined;
    if (status && status in counts) counts[status] += 1;
    else counts.pending += 1;
  }

  console.log("\nSummary");
  console.log(`  exists: ${counts.exists}`);
  console.log(`  closed: ${counts.closed}`);
  console.log(`  cannot_confirm: ${counts.cannot_confirm}`);
  console.log(`  skipped_verified: ${counts.skipped_verified}`);
  console.log(`  error: ${counts.error}`);
  console.log(`  pending: ${counts.pending}`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log("Review that file, geocode storefronts, then dry-run import.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
