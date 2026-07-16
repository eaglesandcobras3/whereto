/**
 * Export business + service categories with browse/rollup groups.
 *
 *   npx tsx scripts/export-categories-csv.ts
 */
import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  BUSINESS_CATEGORY_GROUP_LABELS,
  businessCategoryGroupForSlug,
} from "../lib/business-categories/groups";
import {
  SERVICE_CATEGORY_GROUP_LABELS,
  serviceCategoryGroupForSlug,
} from "../lib/service-categories/groups";
import type { ServiceCategorySlug } from "../lib/service-categories/constants";

dotenv.config({ path: ".env.local" });

function csvEscape(value: string | null | undefined): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  const supabase = createClient(url, key);

  const [bcRes, scRes] = await Promise.all([
    supabase
      .from("business_categories")
      .select("id, title, slug, status, archived_at, parent_category_id, sort")
      .order("title"),
    supabase
      .from("service_categories")
      .select("id, title, slug, status, archived_at, group_slug, sort")
      .order("title"),
  ]);
  if (bcRes.error) throw bcRes.error;
  if (scRes.error) throw scRes.error;

  const parentById = new Map(
    (bcRes.data ?? []).map((r) => [
      r.id as string,
      { title: r.title as string, slug: r.slug as string },
    ]),
  );

  const businessRows = (bcRes.data ?? []).map((r) => {
    const slug = String(r.slug ?? "");
    const group = businessCategoryGroupForSlug(slug);
    const parent = r.parent_category_id
      ? parentById.get(r.parent_category_id as string)
      : null;
    return {
      title: String(r.title ?? ""),
      slug,
      status: String(r.status ?? ""),
      archived: r.archived_at ? "yes" : "no",
      browse_group_slug: group ?? "",
      browse_group_label: group
        ? BUSINESS_CATEGORY_GROUP_LABELS[group]
        : "(search-only / not in storefront browse)",
      parent_title: parent?.title ?? "",
      parent_slug: parent?.slug ?? "",
    };
  });

  const serviceRows = (scRes.data ?? []).map((r) => {
    const slug = String(r.slug ?? "");
    const dbGroup = (r.group_slug as string | null)?.trim() || "";
    const codeGroup = serviceCategoryGroupForSlug(slug as ServiceCategorySlug);
    const rollupSlug = dbGroup || codeGroup || "";
    const rollupLabel = rollupSlug
      ? (SERVICE_CATEGORY_GROUP_LABELS[
          rollupSlug as keyof typeof SERVICE_CATEGORY_GROUP_LABELS
        ] ?? rollupSlug)
      : "(no rollup mapped)";
    return {
      title: String(r.title ?? ""),
      slug,
      status: String(r.status ?? ""),
      archived: r.archived_at ? "yes" : "no",
      rollup_slug: rollupSlug,
      rollup_label: rollupLabel,
      db_group_slug: dbGroup,
    };
  });

  const bizPath = "docs/business-categories.csv";
  const svcPath = "docs/service-categories.csv";
  const combinedPath = "docs/categories-export.csv";

  writeFileSync(
    bizPath,
    [
      [
        "title",
        "slug",
        "status",
        "archived",
        "browse_group_slug",
        "browse_group_label",
        "parent_title",
        "parent_slug",
      ].join(","),
      ...businessRows.map((r) =>
        [
          r.title,
          r.slug,
          r.status,
          r.archived,
          r.browse_group_slug,
          r.browse_group_label,
          r.parent_title,
          r.parent_slug,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n") + "\n",
  );

  writeFileSync(
    svcPath,
    [
      [
        "title",
        "slug",
        "status",
        "archived",
        "rollup_slug",
        "rollup_label",
        "db_group_slug",
      ].join(","),
      ...serviceRows.map((r) =>
        [
          r.title,
          r.slug,
          r.status,
          r.archived,
          r.rollup_slug,
          r.rollup_label,
          r.db_group_slug,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n") + "\n",
  );

  writeFileSync(
    combinedPath,
    [
      [
        "type",
        "title",
        "slug",
        "status",
        "archived",
        "role_or_rollup_slug",
        "role_or_rollup_label",
        "parent_title",
        "parent_slug",
      ].join(","),
      ...businessRows.map((r) =>
        [
          "business_category",
          r.title,
          r.slug,
          r.status,
          r.archived,
          r.browse_group_slug,
          r.browse_group_label,
          r.parent_title,
          r.parent_slug,
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...serviceRows.map((r) =>
        [
          "service_category",
          r.title,
          r.slug,
          r.status,
          r.archived,
          r.rollup_slug,
          r.rollup_label,
          "",
          "",
        ]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n") + "\n",
  );

  console.log(`Wrote ${bizPath} (${businessRows.length} rows)`);
  console.log(`Wrote ${svcPath} (${serviceRows.length} rows)`);
  console.log(`Wrote ${combinedPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
