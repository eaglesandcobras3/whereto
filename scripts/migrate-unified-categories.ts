/**
 * Seed unified categories into business_categories and remap businesses.
 *
 * Prerequisites:
 *   Run scripts/migrations/unified-categories-explorable.sql
 *
 * Usage:
 *   npx tsx scripts/migrate-unified-categories.ts           # dry-run
 *   npx tsx scripts/migrate-unified-categories.ts --apply
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  BUSINESS_SLUG_TO_LEAF,
  getUnifiedLeaves,
  getUnifiedRollups,
  OLD_SERVICE_SLUG_TO_LEAF,
  OLD_STOREFRONT_SLUG_TO_LEAF,
} from "../lib/categories/unified-taxonomy";
import { DIRECTUS_PUBLISHED_STATUS } from "../lib/shop/public-listing-filters";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

type CatRow = {
  id: string;
  title: string;
  slug: string;
  parent_category_id: string | null;
  status: string | null;
  archived_at: string | null;
};

type BizRow = {
  id: string;
  slug: string;
  title: string;
  primary_category_id: string | null;
  service_category_id: string | null;
  is_storefront: boolean | null;
  is_service_business: boolean | null;
  is_explorable: boolean | null;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function loadBusinessCategories(): Promise<CatRow[]> {
  const { data, error } = await supabase
    .from("business_categories")
    .select("id, title, slug, parent_category_id, status, archived_at");
  if (error) throw error;
  return (data ?? []) as CatRow[];
}

async function loadServiceCategories(): Promise<Array<{ id: string; slug: string; title: string }>> {
  const { data, error } = await supabase.from("service_categories").select("id, slug, title");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    slug: String(r.slug ?? ""),
    title: String(r.title ?? ""),
  }));
}

async function ensureRollups(
  existingBySlug: Map<string, CatRow>,
): Promise<Map<string, string>> {
  const rollupIdBySlug = new Map<string, string>();
  for (const rollup of getUnifiedRollups()) {
    const existing = existingBySlug.get(rollup.slug);
    if (existing) {
      rollupIdBySlug.set(rollup.slug, existing.id);
      if (
        APPLY &&
        (existing.title !== rollup.title ||
          existing.parent_category_id != null ||
          existing.archived_at ||
          existing.status !== DIRECTUS_PUBLISHED_STATUS)
      ) {
        const { error } = await supabase
          .from("business_categories")
          .update({
            title: rollup.title,
            parent_category_id: null,
            archived_at: null,
            status: DIRECTUS_PUBLISHED_STATUS,
            is_hidden_from_search: false,
          })
          .eq("id", existing.id);
        if (error) throw error;
      }
      continue;
    }
    const id = randomUUID();
    rollupIdBySlug.set(rollup.slug, id);
    console.log(`${APPLY ? "CREATE" : "would create"} rollup ${rollup.slug}`);
    if (APPLY) {
      const { error } = await supabase.from("business_categories").insert({
        id,
        title: rollup.title,
        slug: rollup.slug,
        parent_category_id: null,
        status: DIRECTUS_PUBLISHED_STATUS,
        is_hidden_from_search: false,
      });
      if (error) throw error;
    }
  }
  return rollupIdBySlug;
}

async function ensureLeaves(
  existingBySlug: Map<string, CatRow>,
  rollupIdBySlug: Map<string, string>,
): Promise<Map<string, string>> {
  const leafIdBySlug = new Map<string, string>();
  for (const leaf of getUnifiedLeaves()) {
    const parentId = rollupIdBySlug.get(leaf.rollupSlug);
    if (!parentId && APPLY) {
      throw new Error(`Missing rollup id for ${leaf.rollupSlug}`);
    }
    const existing = existingBySlug.get(leaf.slug);
    if (existing) {
      leafIdBySlug.set(leaf.slug, existing.id);
      if (APPLY) {
        const { error } = await supabase
          .from("business_categories")
          .update({
            title: leaf.title,
            parent_category_id: parentId ?? null,
            archived_at: null,
            status: DIRECTUS_PUBLISHED_STATUS,
            is_hidden_from_search: false,
          })
          .eq("id", existing.id);
        if (error) throw error;
      }
      continue;
    }
    const id = randomUUID();
    leafIdBySlug.set(leaf.slug, id);
    console.log(`${APPLY ? "CREATE" : "would create"} leaf ${leaf.slug} under ${leaf.rollupSlug}`);
    if (APPLY) {
      const { error } = await supabase.from("business_categories").insert({
        id,
        title: leaf.title,
        slug: leaf.slug,
        parent_category_id: parentId,
        status: DIRECTUS_PUBLISHED_STATUS,
        is_hidden_from_search: false,
      });
      if (error) throw error;
    }
  }
  return leafIdBySlug;
}

async function loadAllBusinesses(): Promise<BizRow[]> {
  const out: BizRow[] = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, title, primary_category_id, service_category_id, is_storefront, is_service_business, is_explorable",
      )
      .is("archived_at", null)
      .range(from, from + page - 1);
    if (error) throw error;
    const rows = (data ?? []) as BizRow[];
    out.push(...rows);
    if (rows.length < page) break;
    from += page;
  }
  return out;
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  let existing = await loadBusinessCategories();
  let existingBySlug = new Map(existing.map((c) => [c.slug, c]));

  const rollupIdBySlug = await ensureRollups(existingBySlug);
  // Refresh after rollup creates
  if (APPLY) {
    existing = await loadBusinessCategories();
    existingBySlug = new Map(existing.map((c) => [c.slug, c]));
    for (const [slug, id] of rollupIdBySlug) {
      if (!existingBySlug.has(slug)) {
        // dry path used generated ids; after apply reload
        const row = existing.find((c) => c.id === id);
        if (row) existingBySlug.set(slug, row);
      }
    }
  }

  const leafIdBySlug = await ensureLeaves(existingBySlug, rollupIdBySlug);
  if (APPLY) {
    existing = await loadBusinessCategories();
    existingBySlug = new Map(existing.map((c) => [c.slug, c]));
    for (const leaf of getUnifiedLeaves()) {
      const row = existingBySlug.get(leaf.slug);
      if (row) leafIdBySlug.set(leaf.slug, row.id);
    }
  }

  const serviceCats = await loadServiceCategories();
  const serviceIdToSlug = new Map(serviceCats.map((c) => [c.id, c.slug]));
  const storefrontIdToSlug = new Map(existing.map((c) => [c.id, c.slug]));

  const businesses = await loadAllBusinesses();
  const uncategorized: Array<{
    id: string;
    slug: string;
    title: string;
    old_primary_slug: string;
    old_service_slug: string;
    is_storefront: string;
    is_service_business: string;
    reason: string;
  }> = [];

  let remapped = 0;
  let clearedService = 0;
  let alreadyOk = 0;
  let conflicts = 0;

  for (const biz of businesses) {
    const oldPrimarySlug = biz.primary_category_id
      ? (storefrontIdToSlug.get(biz.primary_category_id) ?? "")
      : "";
    const oldServiceSlug = biz.service_category_id
      ? (serviceIdToSlug.get(biz.service_category_id) ?? "")
      : "";

    const fromOverride = BUSINESS_SLUG_TO_LEAF[biz.slug] ?? null;
    const fromPrimary = oldPrimarySlug
      ? OLD_STOREFRONT_SLUG_TO_LEAF[oldPrimarySlug] ??
        (leafIdBySlug.has(oldPrimarySlug) ? oldPrimarySlug : null)
      : null;
    const fromService = oldServiceSlug ? OLD_SERVICE_SLUG_TO_LEAF[oldServiceSlug] ?? null : null;

    let targetLeaf: string | null = null;
    let reason = "";

    if (fromOverride) {
      targetLeaf = fromOverride;
      reason = `slug override → ${fromOverride}`;
    } else if (fromPrimary && fromService && fromPrimary !== fromService) {
      conflicts += 1;
      targetLeaf = biz.is_service_business && !biz.is_storefront ? fromService : fromPrimary;
      reason = `conflict primary=${fromPrimary} service=${fromService}; chose ${targetLeaf}`;
    } else if (fromPrimary) {
      targetLeaf = fromPrimary;
    } else if (fromService) {
      targetLeaf = fromService;
    } else if (oldPrimarySlug && leafIdBySlug.has(oldPrimarySlug)) {
      targetLeaf = oldPrimarySlug;
    } else {
      reason = `unmapped primary=${oldPrimarySlug || "(none)"} service=${oldServiceSlug || "(none)"}`;
    }

    const targetId = targetLeaf ? leafIdBySlug.get(targetLeaf) : undefined;
    if (!targetId) {
      uncategorized.push({
        id: biz.id,
        slug: biz.slug,
        title: biz.title,
        old_primary_slug: oldPrimarySlug,
        old_service_slug: oldServiceSlug,
        is_storefront: String(Boolean(biz.is_storefront)),
        is_service_business: String(Boolean(biz.is_service_business)),
        reason: reason || `missing leaf id for ${targetLeaf}`,
      });
      continue;
    }

    const needsPrimary = biz.primary_category_id !== targetId;
    const needsClearService = biz.service_category_id != null;
    if (!needsPrimary && !needsClearService) {
      alreadyOk += 1;
      continue;
    }

    remapped += 1;
    if (needsClearService) clearedService += 1;
    if (APPLY) {
      const patch: Record<string, unknown> = {
        primary_category_id: targetId,
        service_category_id: null,
      };
      const { error } = await supabase.from("businesses").update(patch).eq("id", biz.id);
      if (error) throw new Error(`${biz.slug}: ${error.message}`);
    }
  }

  const unifiedSlugs = new Set(getUnifiedLeaves().map((l) => l.slug));
  for (const r of getUnifiedRollups()) unifiedSlugs.add(r.slug);

  let archived = 0;
  for (const cat of existing) {
    if (unifiedSlugs.has(cat.slug)) continue;
    if (cat.archived_at) continue;
    archived += 1;
    if (APPLY) {
      const { error } = await supabase
        .from("business_categories")
        .update({ archived_at: new Date().toISOString(), status: "archived" })
        .eq("id", cat.id);
      if (error) console.warn(`archive ${cat.slug}: ${error.message}`);
    }
  }

  const reportPath = join(process.cwd(), "docs/uncategorized-businesses.csv");
  const header =
    "id,slug,title,old_primary_slug,old_service_slug,is_storefront,is_service_business,reason";
  const lines = [
    header,
    ...uncategorized.map((r) =>
      [
        r.id,
        r.slug,
        r.title,
        r.old_primary_slug,
        r.old_service_slug,
        r.is_storefront,
        r.is_service_business,
        r.reason,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");

  console.log("\nSummary");
  console.log(`  businesses scanned: ${businesses.length}`);
  console.log(`  already ok: ${alreadyOk}`);
  console.log(`  ${APPLY ? "remapped" : "would remap"}: ${remapped}`);
  console.log(`  service_category cleared: ${clearedService}`);
  console.log(`  conflicts (chose one): ${conflicts}`);
  console.log(`  uncategorized flagged: ${uncategorized.length} → ${reportPath}`);
  console.log(`  ${APPLY ? "archived" : "would archive"} old categories: ${archived}`);
  console.log(`  rollups: ${getUnifiedRollups().length}; leaves: ${getUnifiedLeaves().length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
