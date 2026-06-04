/**
 * Batch-assign `service_category_id` for regional vendors (`is_service_business=true`).
 * One OpenAI call per batch (~25 listings) to minimize API usage.
 *
 * Prerequisite: apply service_categories migrations through `20260604130400_service_categories_full_taxonomy.sql`
 * Audit first: `npx tsx scripts/audit-service-vendors.ts --write-report`
 * Taxonomy: `docs/service-categories-taxonomy.md`
 *
 * Usage:
 *   npx tsx scripts/classify-service-categories.ts --dry-run
 *   npx tsx scripts/classify-service-categories.ts --apply
 *   npx tsx scripts/classify-service-categories.ts --apply --limit 50
 *   npx tsx scripts/classify-service-categories.ts --apply --reclassify
 */

import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import * as dotenv from "dotenv";
import { z } from "zod";
import {
  SERVICE_CATEGORY_CLASSIFICATION_GUIDE,
  SERVICE_CATEGORY_SLUGS,
} from "../lib/service-categories/constants";
import { normalizeServiceCategorySlug } from "../lib/service-categories/normalize";
import { suggestServiceCategoryFromListing } from "../lib/service-categories/suggest-from-business-type";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const RECLASSIFY = process.argv.includes("--reclassify");
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
        .string()
        .describe("Best matching service_categories.slug from the guide"),
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
    .order("title");
  if (!RECLASSIFY) q = q.is("service_category_id", null);
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as VendorRow[];
}

function buildClassificationGuide(): string {
  return SERVICE_CATEGORY_SLUGS.map(
    (slug) => `- ${slug}: ${SERVICE_CATEGORY_CLASSIFICATION_GUIDE[slug]}`,
  ).join("\n");
}

async function classifyBatch(
  vendors: VendorRow[],
  guide: string,
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
    prompt: `You classify Emerald Coast service directory listings (trades, insurance, legal, medical, real estate, etc. — not restaurants, retail shops, or hotels).

Pick exactly one specialty_slug per business. Use the guide below; prefer a specific professional slug over a generic trade when the name clearly indicates insurance, law, dental, CPA, title, etc.

Specialties:
${guide}

Rules:
- Insurance agency names (State Farm, Allstate, Farm Bureau, “insurance agent”) → insurance (slug \`insurance\`, not \`state_farm\`)
- CPA / accounting / payroll / tax → accounting
- Attorney / law firm / PLLC → legal
- Title / escrow / realtor / realty → real_estate
- Dentist / dental / dermatology / medical / rehab / hospice / home health → health_medical (slug is \`health_medical\`, not \`hospice\`)
- Therapist / counseling → counseling
- Cabinets / closets / countertops / blinds → home_improvement
- Watersports / boat charter → marine_boat
- Coworking / flexspace → office_workspace
- Do not invent slugs outside the list.

Businesses:
${lines}

Return exactly one assignment per business id listed above (same count as input).`,
  });

  const batchIds = new Set(vendors.map((v) => v.id));
  const out = new Map<string, string>();
  for (const a of object.assignments) {
    if (!batchIds.has(a.id)) continue;
    const slug = normalizeServiceCategorySlug(a.specialty_slug);
    if (slug) out.set(a.id, slug);
  }
  for (const v of vendors) {
    if (out.has(v.id)) continue;
    const fallback = suggestServiceCategoryFromListing(v);
    if (fallback) out.set(v.id, fallback);
  }
  return out;
}

async function main() {
  const catBySlug = await loadCategories();
  const vendors = await loadVendorsNeedingCategory();
  const scope = RECLASSIFY ? "all service vendors (--reclassify)" : "vendors missing service_category_id";
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"}: ${vendors.length} ${scope}`);
  if (!vendors.length) return;

  const guide = buildClassificationGuide();
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
    const batch = vendors.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} listings)…`);
    const assignments = await classifyBatch(batch, guide);

    for (const v of batch) {
      let slug = assignments.get(v.id);
      let viaFallback = false;
      if (!slug) {
        slug = suggestServiceCategoryFromListing(v) ?? undefined;
        viaFallback = Boolean(slug);
      }
      if (!slug) {
        console.warn(`  skip ${v.title}: no specialty (model + heuristics)`);
        skipped++;
        continue;
      }
      const categoryId = catBySlug.get(slug);
      if (!categoryId) {
        console.warn(`  skip ${v.title}: unknown slug ${slug}`);
        skipped++;
        continue;
      }
      console.log(`  ${v.title} → ${slug}${viaFallback ? " (title heuristic)" : ""}`);
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
