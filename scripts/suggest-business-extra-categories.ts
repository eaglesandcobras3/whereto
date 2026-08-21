/**
 * Suggest extra leaf categories for published businesses (Creative / Technology first).
 * Output CSV for human review — does not write the DB.
 *
 *   npx tsx scripts/suggest-business-extra-categories.ts
 *   npx tsx scripts/suggest-business-extra-categories.ts --limit 20
 *   npx tsx scripts/apply-business-extra-categories.ts --file tmp/suggested-extra-categories.csv --apply
 */

import { writeFileSync, mkdirSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { stringifyCsv, type CsvRow } from "../lib/directory-audit/csv";

dotenv.config({ path: ".env.local" });

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const LIMIT = Math.max(1, Number(argValue("--limit") ?? "80") || 80);
const OUT = argValue("--out") ?? "tmp/suggested-extra-categories.csv";
const PRIORITY_ROLLUPS = new Set(["creative_services", "technology"]);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: cats, error: catErr } = await supabase
    .from("business_categories")
    .select("id, title, slug, parent_category_id")
    .is("archived_at", null);
  if (catErr) throw new Error(catErr.message);

  const byId = new Map((cats ?? []).map((c) => [String(c.id), c]));
  const leaves = (cats ?? []).filter((c) => c.parent_category_id);
  const leafVocab = leaves
    .map((c) => {
      const parent = c.parent_category_id ? byId.get(String(c.parent_category_id)) : null;
      return `${c.title} [${c.slug}] (${parent?.title ?? "—"})`;
    })
    .join("\n");

  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    .select(
      "id, title, slug, excerpt, overview, search_tags, primary_category_id, business_categories!primary_category_id ( title, slug, parent_category_id )",
    )
    .eq("status", "published")
    .is("archived_at", null)
    .not("primary_category_id", "is", null)
    .limit(500);
  if (bizErr) throw new Error(bizErr.message);

  const prioritized = (businesses ?? [])
    .filter((b) => {
      const cat = b.business_categories as {
        slug?: string;
        parent_category_id?: string | null;
      } | null;
      const parent = cat?.parent_category_id
        ? byId.get(String(cat.parent_category_id))
        : null;
      return parent?.slug && PRIORITY_ROLLUPS.has(String(parent.slug));
    })
    .slice(0, LIMIT);

  const rows: CsvRow[] = [];
  for (const b of prioritized) {
    const primary = b.business_categories as { title?: string; slug?: string } | null;
    const prompt = `You assign extra leaf categories for a 30A / South Walton directory listing.
Primary category is already set. Suggest 0-3 ADDITIONAL leaf slugs from the vocabulary that clearly fit.
Do not invent businesses or categories. Prefer empty suggestions over weak matches.

Business: ${b.title}
Primary: ${primary?.title ?? ""} [${primary?.slug ?? ""}]
Excerpt: ${(b.excerpt as string | null) ?? ""}
Overview: ${((b.overview as string | null) ?? "").slice(0, 400)}
Tags: ${Array.isArray(b.search_tags) ? (b.search_tags as string[]).join(", ") : ""}

Leaf vocabulary (title [slug] (rollup)):
${leafVocab}

Return ONLY JSON: {"extra_slugs":["slug"],"confidence":"high"|"medium"|"low","notes":""}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
        temperature: 0.1,
        messages: [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const json = (await res.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!res.ok) throw new Error(json.error?.message || `OpenAI ${res.status}`);
    const text = json.choices?.[0]?.message?.content ?? "{}";
    const fenced = text.match(/\{[\s\S]*\}/);
    let parsed: { extra_slugs?: string[]; confidence?: string; notes?: string } = {};
    try {
      parsed = JSON.parse(fenced?.[0] ?? text) as typeof parsed;
    } catch {
      parsed = { extra_slugs: [], confidence: "low", notes: "parse_error" };
    }
    const extras = (parsed.extra_slugs ?? []).filter(
      (s) => s && s !== primary?.slug,
    );
    if (extras.length === 0) continue;
    rows.push({
      business_id: String(b.id),
      slug: String(b.slug),
      title: String(b.title),
      primary_slug: primary?.slug ?? "",
      suggested_extras: extras.join("|"),
      confidence: parsed.confidence ?? "",
      notes: parsed.notes ?? "",
      apply: "no",
    });
    console.log(`${b.title}: ${extras.join(", ")}`);
  }

  mkdirSync("tmp", { recursive: true });
  writeFileSync(
    OUT,
    stringifyCsv(
      [
        "business_id",
        "slug",
        "title",
        "primary_slug",
        "suggested_extras",
        "confidence",
        "notes",
        "apply",
      ],
      rows,
    ),
  );
  console.log(`\nWrote ${rows.length} suggestion rows → ${OUT}`);
  console.log(`Set apply=yes on rows to keep, then:`);
  console.log(`  npx tsx scripts/apply-business-extra-categories.ts --file ${OUT} --apply`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
