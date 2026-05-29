/**
 * Import businesses from docs/stores.csv into Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-stores-csv.ts              # dry-run + write report
 *   npx tsx scripts/import-stores-csv.ts --apply      # insert missing rows
 *   npx tsx scripts/import-stores-csv.ts --list-only  # only write existing-businesses.md
 */

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { nameSimilarity } from "../lib/admin/duplicate-detection";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const APPLY = process.argv.includes("--apply");
const LIST_ONLY = process.argv.includes("--list-only");

type CsvRow = {
  title: string;
  slug: string;
  town_or_area: string;
  shopping_area: string;
  category: string;
  seo_description: string;
  search_keywords: string;
  excerpt: string;
  contact_information: string;
  website: string;
  source_url: string;
  markdown_writeup: string;
};

const TOWN_ALIASES: Record<string, string> = {
  "Dune Allen Beach / Santa Rosa Beach": "Dune Allen Beach",
  WaterColor: "Watercolor",
};

/** CSV shopping_area label → existing DB area title (when names differ). */
const AREA_ALIASES: Record<string, string> = {
  "Grand Boulevard": "Grand Boulevard at Sandestin",
  "Seaside Central Square / Airstream Row": "Seaside Town Square",
  "Grayton Beach / Uptown Grayton": "Shops of Grayton",
  "Peddlers Pavilion / Seacrest Village": "Peddlers Pavilion",
  "Inlet Beach / Shoppes at Inlet / Big Chill Area": "30Avenue",
  "Downtown Carillon / Market Street": "Downtown Carillon Beach",
  "Seagrove Plaza / Seagrove Beach": "Greenway Station",
};

const CATEGORY_SLUG_MAP: Record<string, string> = {
  restaurants: "restaurants",
  "coffee shops": "coffee_shops",
  bars: "bars",
  shopping: "shopping",
  services: "services",
  activity: "activities",
};

function parseCsv(text: string): CsvRow[] {
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
  return body.map((cells) =>
    Object.fromEntries(header.map((h, idx) => [h, cells[idx] ?? ""])),
  ) as CsvRow[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveTownTitle(csvTown: string): string {
  if (TOWN_ALIASES[csvTown]) return TOWN_ALIASES[csvTown];
  const first = csvTown.split("/")[0]?.trim();
  return first || csvTown;
}

function matchAreaTitle(
  csvLabel: string,
  areas: { id: string; title: string; slug: string; town_id: string | null }[],
  townId: string | null,
): { id: string; title: string } | null {
  if (!csvLabel.trim()) return null;
  const alias = AREA_ALIASES[csvLabel] ?? csvLabel;
  const n = norm(alias);
  const scoped = townId ? areas.filter((a) => a.town_id === townId) : areas;

  const exact = scoped.find((a) => norm(a.title) === n);
  if (exact) return exact;

  const contains = scoped.find(
    (a) => norm(a.title).includes(n) || n.includes(norm(a.title)),
  );
  if (contains) return contains;

  const global = areas.find((a) => norm(a.title) === n);
  return global ?? null;
}

function categorySlug(csvCategory: string): string {
  const key = csvCategory.trim().toLowerCase();
  const mapped = CATEGORY_SLUG_MAP[key];
  if (!mapped) throw new Error(`Unknown category: ${csvCategory}`);
  return mapped;
}

function writeExistingList(
  businesses: { title: string; slug: string; status: string; town_id: string | null }[],
  towns: { id: string; title: string }[],
) {
  const townById = new Map(towns.map((t) => [t.id, t.title]));
  const lines = [
    "# Businesses currently in Supabase",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Total: **${businesses.length}**`,
    "",
    "| Title | Slug | Town | Status |",
    "| --- | --- | --- | --- |",
  ];
  for (const b of [...businesses].sort((a, c) => a.title.localeCompare(c.title))) {
    const town = b.town_id ? (townById.get(b.town_id) ?? "") : "";
    lines.push(`| ${b.title.replace(/\|/g, "\\|")} | ${b.slug} | ${town} | ${b.status} |`);
  }
  writeFileSync("docs/existing-businesses.md", lines.join("\n") + "\n");
  console.log(`Wrote docs/existing-businesses.md (${businesses.length} rows)`);
}

async function main() {
  const csv = parseCsv(readFileSync("docs/stores.csv", "utf8"));

  const [{ data: businesses, error: bErr }, { data: areas, error: aErr }, { data: towns, error: tErr }, { data: cats, error: cErr }] =
    await Promise.all([
      supabase.from("businesses").select("id, title, slug, town_id, area_id, status"),
      supabase.from("areas").select("id, title, slug, town_id, is_shopping_area, status"),
      supabase.from("towns").select("id, title, slug"),
      supabase.from("business_categories").select("id, title, slug"),
    ]);

  if (bErr || aErr || tErr || cErr || !businesses || !areas || !towns || !cats) {
    throw bErr ?? aErr ?? tErr ?? cErr ?? new Error("fetch failed");
  }

  const townRows = towns;

  writeExistingList(businesses, townRows);

  if (LIST_ONLY) return;

  const townByTitle = new Map(townRows.map((t) => [norm(t.title), t]));
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));
  const dbSlugSet = new Set(businesses.map((b) => b.slug));
  const dbByTownTitle = new Map<string, typeof businesses>();

  for (const b of businesses) {
    const key = `${b.town_id ?? "none"}::${norm(b.title)}`;
    const list = dbByTownTitle.get(key) ?? [];
    list.push(b);
    dbByTownTitle.set(key, list);
  }

  let areasCreated = 0;
  const areaRows = [...areas];

  async function ensureArea(
    csvLabel: string,
    townId: string | null,
  ): Promise<{ id: string; title: string } | null> {
    if (!csvLabel.trim()) return null;
    const existing = matchAreaTitle(csvLabel, areaRows, townId);
    if (existing) return existing;

    const title = AREA_ALIASES[csvLabel] ?? csvLabel;
    const slugBase = slugify(title);
    const slug = townId
      ? `${slugBase}-${townRows.find((t) => t.id === townId)?.slug ?? "area"}`
      : slugBase;

    const payload = {
      id: randomUUID(),
      title,
      slug,
      town_id: townId,
      is_shopping_area: true,
      area_type: "shopping-area",
      status: "published",
      excerpt: `Shopping and dining in ${title}.`,
    };

    console.log(`  + area: ${title} (${slug})`);
    if (APPLY) {
      const { error } = await supabase.from("areas").insert(payload);
      if (error) throw new Error(`area insert ${title}: ${error.message}`);
    }
    areaRows.push({ ...payload, slug });
    areasCreated++;
    return { id: payload.id, title: payload.title };
  }

  const toInsert: Record<string, unknown>[] = [];
  const skipped = { slug: 0, title: 0, town: 0 };

  for (const row of csv) {
    if (dbSlugSet.has(row.slug)) {
      skipped.slug++;
      continue;
    }

    const townTitle = resolveTownTitle(row.town_or_area);
    const town = townByTitle.get(norm(townTitle));
    if (!town) {
      console.warn(`  ! no town for "${row.town_or_area}" → "${townTitle}" (${row.title})`);
      skipped.town++;
      continue;
    }

    const titleKey = `${town.id}::${norm(row.title)}`;
    const sameTownTitle = dbByTownTitle.get(titleKey) ?? [];
    const dup = sameTownTitle.find((b) => nameSimilarity(b.title, row.title) >= 0.92);
    if (dup) {
      skipped.title++;
      continue;
    }

    const area = await ensureArea(row.shopping_area, town.id);
    const cat = catBySlug.get(categorySlug(row.category));
    if (!cat) {
      throw new Error(`Category slug missing: ${row.category}`);
    }

    const phone = row.contact_information?.trim() || null;
    const website = row.website?.trim() || null;

    toInsert.push({
      id: randomUUID(),
      title: row.title,
      slug: row.slug,
      status: "published",
      town_id: town.id,
      area_id: area?.id ?? null,
      primary_category_id: cat.id,
      excerpt: row.excerpt?.trim() || null,
      seo_description: row.seo_description?.trim() || null,
      search_keywords: row.search_keywords?.trim() || null,
      content: row.markdown_writeup?.trim() || null,
      phone,
      website,
      is_storefront: true,
      is_service_business: false,
      claim_status: "unclaimed",
      published_at: new Date().toISOString(),
    });

    dbSlugSet.add(row.slug);
    sameTownTitle.push({
      id: "pending",
      title: row.title,
      slug: row.slug,
      town_id: town.id,
      area_id: area?.id ?? null,
      status: "published",
    });
    dbByTownTitle.set(titleKey, sameTownTitle);
  }

  console.log("\n--- Summary ---");
  console.log(`CSV rows: ${csv.length}`);
  console.log(`DB businesses (before): ${businesses.length}`);
  console.log(`Skipped (slug exists): ${skipped.slug}`);
  console.log(`Skipped (title dup in town): ${skipped.title}`);
  console.log(`Skipped (no town): ${skipped.town}`);
  console.log(`Areas to create: ${areasCreated}`);
  console.log(`Businesses to insert: ${toInsert.length}`);
  console.log(APPLY ? "Mode: APPLY" : "Mode: dry-run (pass --apply to write)");

  if (!APPLY || toInsert.length === 0) return;

  const batchSize = 25;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase.from("businesses").insert(batch);
    if (error) throw new Error(`business insert batch ${i}: ${error.message}`);
    console.log(`  inserted ${Math.min(i + batchSize, toInsert.length)} / ${toInsert.length}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
