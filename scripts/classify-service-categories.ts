/**
 * Batch-assign `service_category_id` for regional vendors (`is_service_business=true`).
 * One OpenAI call per batch (~25 listings) to minimize API usage.
 *
 * Prerequisite: apply `supabase/migrations/20260604130000_service_categories.sql`
 *
 * Usage:
 *   npx tsx scripts/classify-service-categories.ts --dry-run
 *   npx tsx scripts/classify-service-categories.ts --apply
 *   npx tsx scripts/classify-service-categories.ts --apply --limit 50
 */

import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import * as dotenv from "dotenv";
import { z } from "zod";
import { SERVICE_CATEGORY_SLUGS } from "../lib/service-categories/constants";
import { normalizeServiceCategorySlug } from "../lib/service-categories/normalize";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = 25;
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? Math.max(1, Number(process.argv[limitIdx + 1]) || 0) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}
if (!openaiKey) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const batchSchema = z.object({
  assignments: z.array(
    z.object({
      id: z.string().describe("business UUID from the input list"),
      specialty_slug: z
        .enum(SERVICE_CATEGORY_SLUGS)
        .describe("Best matching service_categories.slug"),
    }),
  ),
});

type VendorRow = {
  id: string;
  title: string;
  excerpt: string | null;
  search_keywords: string | null;
  business_type: string | null;
};

async function loadCategories(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("service_categories")
    .select("id, slug")
    .is("archived_at", null)
    .eq("status", "published");
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(String((row as { slug: string }).slug), String((row as { id: string }).id));
  }
  return map;
}

async function loadVendorsNeedingCategory(): Promise<VendorRow[]> {
  let q = supabase
    .from("businesses")
    .select("id, title, excerpt, search_keywords, business_type")
    .is("archived_at", null)
    .eq("status", "published")
    .eq("is_service_business", true)
    .is("service_category_id", null)
    .order("title");
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as VendorRow[];
}

async function classifyBatch(
  vendors: VendorRow[],
  slugList: string,
): Promise<Map<string, string>> {
  const lines = vendors
    .map(
      (v, i) =>
        `${i + 1}. id=${v.id} | ${v.title}${v.business_type ? ` | type: ${v.business_type}` : ""}${v.excerpt ? ` | ${v.excerpt.slice(0, 120)}` : ""}`,
    )
    .join("\n");

  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    schema: batchSchema,
    prompt: `You classify 30A regional service providers (mobile vendors, contractors, trades — not restaurants or shops).

Pick exactly one specialty_slug per business from this list:
${slugList}

Use "other" only when nothing else fits.

Businesses:
${lines}

Return one assignment per business id listed above.`,
  });

  const out = new Map<string, string>();
  for (const a of object.assignments) {
    const slug = normalizeServiceCategorySlug(a.specialty_slug) ?? "other";
    out.set(a.id, slug);
  }
  return out;
}

async function main() {
  const catBySlug = await loadCategories();
  const vendors = await loadVendorsNeedingCategory();
  console.log(
    `${APPLY ? "APPLY" : "DRY-RUN"}: ${vendors.length} service vendors without service_category_id`,
  );
  if (!vendors.length) return;

  const slugList = [...SERVICE_CATEGORY_SLUGS].join(", ");
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
    const batch = vendors.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} listings)…`);
    const assignments = await classifyBatch(batch, slugList);

    for (const v of batch) {
      const slug = assignments.get(v.id) ?? "other";
      const categoryId = catBySlug.get(slug);
      if (!categoryId) {
        console.warn(`  skip ${v.title}: unknown slug ${slug}`);
        skipped++;
        continue;
      }
      console.log(`  ${v.title} → ${slug}`);
      if (APPLY) {
        const { error } = await supabase
          .from("businesses")
          .update({ service_category_id: categoryId })
          .eq("id", v.id);
        if (error) {
          console.error(`  FAILED ${v.id}:`, error.message);
          skipped++;
        } else {
          updated++;
        }
      } else {
        updated++;
      }
    }
  }

  console.log(`\nDone. ${APPLY ? "Updated" : "Would update"}: ${updated}, skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
