/**
 * Suggest seed businesses for light leaf categories (under 10 published listings)
 * via OpenAI (default) or Gemini. Writes ONE import-ready seed CSV.
 *
 * Output columns:
 *   title,town,area,is_storefront,is_service_business,seed_category,seed_category_slug
 * (import-businesses-seed-gemini.ts only requires the first five; category cols are tracking.)
 *
 * Discover (this script) defaults to OpenAI. Import/verify stays Gemini.
 *
 * Usage:
 *   npx tsx scripts/suggest-category-seed-businesses.ts
 *   npx tsx scripts/suggest-category-seed-businesses.ts --limit-categories 3
 *   npx tsx scripts/suggest-category-seed-businesses.ts --target 10 --overfetch 1.5
 *   npx tsx scripts/suggest-category-seed-businesses.ts --retry-thin
 *   npx tsx scripts/suggest-category-seed-businesses.ts --retry-thin --overfetch 2
 *
 * --retry-thin re-asks only categories whose prior seed rows are still below --target
 * need (same town list — no region expansion). Appends new rows to the seed CSV.
 *
 * Then verify + insert (Gemini):
 *   npx tsx scripts/import-businesses-seed-gemini.ts --file tmp/seed-light-categories.csv
 *   npx tsx scripts/import-businesses-seed-gemini.ts --file tmp/seed-light-categories.csv --apply
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { parseCsv, stringifyCsv, type CsvRow } from "../lib/directory-audit/csv";

dotenv.config({ path: ".env.local" });

const TARGET_DEFAULT = 10;
const OVERFETCH_DEFAULT = 1.5;
const RETRY_OVERFETCH_DEFAULT = 2;
const SEED_HEADERS = [
  "title",
  "town",
  "area",
  "is_storefront",
  "is_service_business",
  "seed_category",
  "seed_category_slug",
] as const;

/** Fallback if DB towns cannot load — matches current `towns` table (no Destin/Miramar). */
const TOWNS_FALLBACK = [
  "Alys Beach",
  "Blue Mountain Beach",
  "Carillon Beach",
  "Dune Allen Beach",
  "Grayton Beach",
  "Gulf Place",
  "Inlet Beach",
  "Rosemary Beach",
  "Sandestin",
  "Santa Rosa Beach",
  "Seacrest Beach",
  "Seagrove Beach",
  "Seaside",
  "Watercolor",
  "Watersound",
] as const;

type Provider = "gemini" | "openai";

type LightCategory = {
  business_count: number;
  category_title: string;
  category_slug: string;
  rollup_title: string;
  rollup_slug: string;
  category_id: string;
  /** How many more published listings to reach --target. */
  need: number;
  /** How many suggestions to request (need × overfetch, rounded up). */
  ask: number;
};

type CategoryMeta = {
  category_title: string;
  category_slug: string;
  need: number;
  ask: number;
  got: number;
  titles: string[];
};

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBoolLoose(raw: string): "TRUE" | "FALSE" {
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return "TRUE";
  return "FALSE";
}

function extractCsvBlock(text: string): string {
  const fenced = text.match(/```(?:csv)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) =>
    /^title\s*,\s*town\s*,\s*area\s*,\s*is_storefront\s*,\s*is_service_business/i.test(l.trim()),
  );
  if (start >= 0) return lines.slice(start).join("\n").trim();
  return text.trim();
}

function buildSuggestPrompt(
  cat: LightCategory,
  excludeTitles: string[],
  towns: string[],
  opts: { retry: boolean },
): string {
  const excludeBlock =
    excludeTitles.length === 0
      ? "(none)"
      : excludeTitles.map((t) => `- ${t}`).join("\n");

  const retryIntro = opts.retry
    ? `This is a SECOND PASS. A prior pass returned too few usable names for this category. Suggest ADDITIONAL real businesses only — do not repeat anything in the exclude list.\n\n`
    : "";

  return `You are helping build a local business directory for Florida's Scenic Highway 30A / South Walton corridor.

${retryIntro}Task: suggest up to ${cat.ask} REAL businesses for this category that either:
- have a public storefront in one of our towns (list below), OR
- are service businesses that actively serve customers in those towns / along 30A

(We still need about ${cat.need} more verified listings; asking for ${cat.ask} leaves room for closed, unverifiable, or duplicate suggestions.)

Category: ${cat.category_title}
Rollup / group: ${cat.rollup_title}

Our towns ONLY (do not place storefronts outside this list; do not expand to Destin, Miramar Beach, Panama City, Freeport, etc.):
${towns.join(", ")}

Already excluded (DO NOT suggest these or near-duplicates):
${excludeBlock}

Hard rules:
- Do NOT invent, guess, or fabricate business names.
- Only include businesses you can support with a real public source (website, Google Business listing, chamber page, news, etc.).
- Prefer local / independent operators over national chains when possible.
- If you cannot find ${cat.ask} real matches inside our towns / service area, return fewer — never pad with made-up names.
- Storefront: is_storefront=TRUE and town must be one of the towns listed above.
- Service-only (no public storefront): is_storefront=FALSE, is_service_business=TRUE, leave town and area blank — but the business must clearly serve our towns / 30A.
- Both TRUE is allowed when accurate.
- Leave area blank unless you are confident of a named sub-area (usually leave blank).
- is_storefront and is_service_business must be TRUE or FALSE (uppercase).

Output ONLY a CSV code block with exactly these headers and no other columns:
title,town,area,is_storefront,is_service_business

No commentary before or after the code block.`;
}

function loadLightCategories(
  path: string,
  target: number,
  overfetch: number,
): LightCategory[] {
  if (!existsSync(path)) {
    throw new Error(`Missing categories file: ${path}`);
  }
  const rows = parseCsv(readFileSync(path, "utf8"));
  return rows
    .map((r) => {
      const business_count = Number(r.business_count ?? 0) || 0;
      const need = Math.max(0, target - business_count);
      const ask = need > 0 ? Math.max(need, Math.ceil(need * overfetch)) : 0;
      return {
        business_count,
        category_title: (r.category_title ?? "").trim(),
        category_slug: (r.category_slug ?? "").trim(),
        rollup_title: (r.rollup_title ?? "").trim(),
        rollup_slug: (r.rollup_slug ?? "").trim(),
        category_id: (r.category_id ?? "").trim(),
        need,
        ask,
      };
    })
    .filter((c) => c.category_title && c.need > 0);
}

function loadExcludeByCategory(path: string | undefined): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!path || !existsSync(path)) return map;
  const rows = parseCsv(readFileSync(path, "utf8"));
  for (const r of rows) {
    const cat = (r.category_title ?? "").trim();
    const title = (r.business_title ?? "").trim();
    if (!cat || !title) continue;
    const list = map.get(cat) ?? [];
    list.push(title);
    map.set(cat, list);
  }
  return map;
}

async function loadTownTitlesFromDb(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [...TOWNS_FALLBACK];

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("towns").select("title").order("title");
  if (error) throw new Error(error.message);
  const titles = (data ?? [])
    .map((r) => String(r.title ?? "").trim())
    .filter(Boolean);
  return titles.length ? titles : [...TOWNS_FALLBACK];
}

async function loadAllExistingTitlesFromDb(): Promise<Set<string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Set();

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const titles = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses")
      .select("title")
      .is("archived_at", null)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const row of batch) {
      const t = String(row.title ?? "").trim();
      if (t) titles.add(normalizeTitle(t));
    }
    if (batch.length < 1000) break;
    from += 1000;
  }
  return titles;
}

type GeminiResponse = Record<string, unknown>;

async function callGemini(prompt: string, model: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  });
  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new Error(err?.message || `Gemini HTTP ${res.status}`);
  }
  const candidates = json.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const text = candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini returned empty text");
  return text;
}

async function callOpenAI(prompt: string, model: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You suggest real local businesses only. Never invent names. Stay inside the listed towns. Output a CSV code block only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) throw new Error(json.error?.message || `OpenAI HTTP ${res.status}`);
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("OpenAI returned empty text");
  return text;
}

function parseSuggestionRows(text: string, globalExclude: Set<string>): CsvRow[] {
  const csvText = extractCsvBlock(text);
  let rows: CsvRow[];
  try {
    rows = parseCsv(
      csvText.includes("title,")
        ? csvText
        : `title,town,area,is_storefront,is_service_business\n${csvText}`,
    );
  } catch {
    return [];
  }

  const out: CsvRow[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const title = (r.title ?? "").trim();
    if (!title) continue;
    const key = normalizeTitle(title);
    if (!key || seen.has(key) || globalExclude.has(key)) continue;
    seen.add(key);

    const isStorefront = parseBoolLoose(r.is_storefront ?? "FALSE");
    const isService = parseBoolLoose(r.is_service_business ?? "FALSE");
    if (isStorefront === "FALSE" && isService === "FALSE") {
      out.push({
        title,
        town: "",
        area: "",
        is_storefront: "FALSE",
        is_service_business: "TRUE",
      });
      continue;
    }

    const serviceOnly = isService === "TRUE" && isStorefront === "FALSE";
    out.push({
      title,
      town: serviceOnly ? "" : (r.town ?? "").trim(),
      area: serviceOnly ? "" : (r.area ?? "").trim(),
      is_storefront: isStorefront,
      is_service_business: isService,
    });
  }
  return out;
}

function metaPathFor(outPath: string): string {
  return outPath.replace(/\.csv$/i, "-meta.json");
}

function writeMeta(path: string, metas: CategoryMeta[]) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(metas, null, 2)}\n`);
}

function loadMeta(path: string): CategoryMeta[] | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CategoryMeta[];
  } catch {
    return null;
  }
}

function seedRowsByCategorySlug(rows: CsvRow[]): Map<string, CsvRow[]> {
  const map = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const slug = (row.seed_category_slug ?? "").trim();
    if (!slug) continue;
    const list = map.get(slug) ?? [];
    list.push(row);
    map.set(slug, list);
  }
  return map;
}

/**
 * First full run wrote rows without seed_category. Reconstruct from known per-category
 * suggestion counts (same order as categories-under-10 CSV / prior console log).
 */
function annotateSeedFromGotCounts(
  seedRows: CsvRow[],
  cats: LightCategory[],
  gotCounts: number[],
): { rows: CsvRow[]; metas: CategoryMeta[] } {
  if (gotCounts.length !== cats.length) {
    throw new Error(
      `gotCounts length ${gotCounts.length} != categories ${cats.length}`,
    );
  }
  const sum = gotCounts.reduce((a, b) => a + b, 0);
  if (sum !== seedRows.length) {
    throw new Error(
      `gotCounts sum ${sum} != seed rows ${seedRows.length} — re-run full suggest or provide meta`,
    );
  }

  const rows: CsvRow[] = [];
  const metas: CategoryMeta[] = [];
  let offset = 0;
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const got = gotCounts[i];
    const slice = seedRows.slice(offset, offset + got);
    offset += got;
    const titles: string[] = [];
    for (const row of slice) {
      titles.push(row.title);
      rows.push({
        ...row,
        seed_category: cat.category_title,
        seed_category_slug: cat.category_slug,
      });
    }
    metas.push({
      category_title: cat.category_title,
      category_slug: cat.category_slug,
      need: cat.need,
      ask: cat.ask,
      got,
      titles,
    });
  }
  return { rows, metas };
}

/** Counts from the completed full OpenAI run (97 categories, in CSV order). */
const PRIOR_FULL_RUN_GOT_COUNTS = [
  15, 14, 14, 14, 15, 10, 14, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 12,
  15, 14, 15, 14, 15, 15, 10, 8, 10, 13, 12, 11, 15, 12, 15, 15, 15, 15, 11, 14, 15, 15, 14,
  9, 15, 15, 10, 14, 15, 15, 15, 15, 14, 15, 14, 12, 15, 14, 7, 10, 14, 6, 9, 14, 14, 9, 11,
  6, 11, 8, 8, 12, 11, 11, 11, 7, 10, 7, 9, 8, 1, 6, 8, 6, 4, 6, 5, 3, 6, 3, 3, 2, 3, 1,
];

async function main() {
  const provider = (argValue("--provider") ?? "openai").toLowerCase() as Provider;
  if (provider !== "gemini" && provider !== "openai") {
    throw new Error('--provider must be "gemini" or "openai"');
  }

  const retryThin = hasFlag("--retry-thin");
  const target = Math.max(1, Number(argValue("--target") ?? TARGET_DEFAULT) || TARGET_DEFAULT);
  const overfetchDefault = retryThin ? RETRY_OVERFETCH_DEFAULT : OVERFETCH_DEFAULT;
  const overfetchRaw = Number(argValue("--overfetch") ?? overfetchDefault);
  const overfetch =
    Number.isFinite(overfetchRaw) && overfetchRaw >= 1 ? overfetchRaw : overfetchDefault;
  const categoriesPath =
    argValue("--categories-file") ?? "tmp/categories-under-10-businesses.csv";
  const existingPath =
    argValue("--existing-file") ?? "tmp/existing-in-categories-under-10.csv";
  const outPath = argValue("--out") ?? "tmp/seed-light-categories.csv";
  const delayMs = Math.max(0, Number(argValue("--delay-ms") ?? "600") || 0);
  const limitCategoriesRaw = argValue("--limit-categories");
  const limitCategories = limitCategoriesRaw
    ? Math.max(1, Number(limitCategoriesRaw) || 0)
    : null;
  const skipDbExclude = hasFlag("--skip-db-exclude");
  const annotateOnly = hasFlag("--annotate-prior-run");

  const catsForTarget = loadLightCategories(categoriesPath, target, OVERFETCH_DEFAULT);
  const metaFile = metaPathFor(outPath);

  if (annotateOnly || (retryThin && existsSync(outPath))) {
    const rawSeed = parseCsv(readFileSync(outPath, "utf8"));
    const hasSlug = rawSeed.some((r) => (r.seed_category_slug ?? "").trim());
    if (!hasSlug) {
      // Drop any prior retry rows past the original full-run length, then annotate.
      const original = rawSeed.slice(0, PRIOR_FULL_RUN_GOT_COUNTS.reduce((a, b) => a + b, 0));
      console.log(
        `Annotating seed CSV with seed_category_slug from full-run counts (${original.length} original rows)…`,
      );
      const { rows, metas } = annotateSeedFromGotCounts(
        original,
        catsForTarget,
        PRIOR_FULL_RUN_GOT_COUNTS,
      );
      writeFileSync(outPath, stringifyCsv([...SEED_HEADERS], rows));
      writeMeta(metaFile, metas);
      console.log(`Annotated ${rows.length} rows → ${outPath}`);
      console.log(`Wrote meta → ${metaFile}`);
      if (annotateOnly) return;
    }
  }

  const towns = await loadTownTitlesFromDb();
  console.log(`Towns (${towns.length}): ${towns.join(", ")}`);

  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    "";
  const openaiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const geminiModel =
    argValue("--model") ?? process.env.GEMINI_MODEL?.trim() ?? "gemini-3.7-flash";
  const openaiModel = argValue("--model") ?? process.env.OPENAI_MODEL?.trim() ?? "gpt-4.1-mini";

  if (provider === "gemini" && !geminiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env.local");
  }
  if (provider === "openai" && !openaiKey) {
    throw new Error("Missing OPENAI_API_KEY in .env.local");
  }

  const excludeByCat = loadExcludeByCategory(existingPath);
  const globalExclude = skipDbExclude
    ? new Set<string>()
    : await loadAllExistingTitlesFromDb();
  console.log(
    `Exclude titles from DB: ${globalExclude.size}${skipDbExclude ? " (skipped)" : ""}`,
  );
  for (const list of excludeByCat.values()) {
    for (const t of list) globalExclude.add(normalizeTitle(t));
  }

  let seedRows: CsvRow[] = [];
  let metas: CategoryMeta[] = [];
  let cats: LightCategory[] = [];

  if (retryThin) {
    if (!existsSync(outPath)) {
      throw new Error(`--retry-thin requires existing seed file: ${outPath}`);
    }
    seedRows = parseCsv(readFileSync(outPath, "utf8"));
    for (const row of seedRows) {
      const t = (row.title ?? "").trim();
      if (t) globalExclude.add(normalizeTitle(t));
    }

    const byCat = seedRowsByCategorySlug(seedRows);
    if (byCat.size === 0) {
      throw new Error(
        "Seed CSV has no seed_category_slug column. Re-run with --annotate-prior-run first.",
      );
    }

    const thin: LightCategory[] = [];
    for (const base of catsForTarget) {
      const got = byCat.get(base.category_slug)?.length ?? 0;
      const stillNeed = Math.max(0, base.need - got);
      if (stillNeed <= 0) continue;
      thin.push({
        ...base,
        need: stillNeed,
        ask: Math.max(stillNeed, Math.ceil(stillNeed * overfetch)),
      });
    }
    cats = limitCategories ? thin.slice(0, limitCategories) : thin;
    metas = loadMeta(metaFile) ?? [];
    console.log(
      `Retry-thin: ${cats.length} categories still short of need (overfetch ${overfetch}×)…`,
    );
  } else {
    const catsAll = loadLightCategories(categoriesPath, target, overfetch);
    cats = limitCategories ? catsAll.slice(0, limitCategories) : catsAll;
    console.log(
      `Suggesting for ${cats.length} categories via ${provider} (target ${target}, overfetch ${overfetch}×)…`,
    );
  }

  if (cats.length === 0) {
    console.log("Nothing to do — no thin categories (or empty category list).");
    return;
  }

  const failures: Array<{ category: string; error: string }> = [];

  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const priorSeedTitles = seedRows
      .filter((r) => (r.seed_category_slug ?? "") === cat.category_slug)
      .map((r) => r.title);
    const exclude = [
      ...(excludeByCat.get(cat.category_title) ?? []),
      ...priorSeedTitles,
    ];
    const prompt = buildSuggestPrompt(cat, exclude, towns, { retry: retryThin });
    process.stdout.write(
      `[${i + 1}/${cats.length}] ${cat.category_title} (${cat.category_slug}; need ${cat.need}, ask ${cat.ask})… `,
    );

    try {
      const text =
        provider === "gemini"
          ? await callGemini(prompt, geminiModel, geminiKey)
          : await callOpenAI(prompt, openaiModel, openaiKey);
      const rows = parseSuggestionRows(text, globalExclude).slice(0, cat.ask);
      const titles: string[] = [];
      for (const row of rows) {
        globalExclude.add(normalizeTitle(row.title));
        titles.push(row.title);
        seedRows.push({
          ...row,
          seed_category: cat.category_title,
          seed_category_slug: cat.category_slug,
        });
      }

      const existingMeta = metas.find((m) => m.category_slug === cat.category_slug);
      if (existingMeta) {
        existingMeta.got += rows.length;
        existingMeta.titles.push(...titles);
        existingMeta.ask = cat.ask;
        existingMeta.need = cat.need;
      } else {
        metas.push({
          category_title: cat.category_title,
          category_slug: cat.category_slug,
          need: cat.need,
          ask: cat.ask,
          got: rows.length,
          titles,
        });
      }

      console.log(`${rows.length} suggestions`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failures.push({ category: cat.category_title, error: message });
      console.log(`FAILED: ${message}`);
    }

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, stringifyCsv([...SEED_HEADERS], seedRows));
    writeMeta(metaFile, metas);

    if (delayMs > 0 && i < cats.length - 1) await sleep(delayMs);
  }

  writeFileSync(outPath, stringifyCsv([...SEED_HEADERS], seedRows));
  writeMeta(metaFile, metas);
  console.log(`\nWrote ${seedRows.length} seed rows → ${outPath}`);
  if (failures.length) {
    const failPath = outPath.replace(/\.csv$/i, "-failures.json");
    writeFileSync(failPath, `${JSON.stringify(failures, null, 2)}\n`);
    console.log(`Failures (${failures.length}) → ${failPath}`);
  }
  console.log(`\nNext:`);
  console.log(`  npx tsx scripts/import-businesses-seed-gemini.ts --file ${outPath}`);
  console.log(`  npx tsx scripts/import-businesses-seed-gemini.ts --file ${outPath} --apply`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
