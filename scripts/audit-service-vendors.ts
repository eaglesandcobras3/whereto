/**
 * Audit all businesses: storefront vs service vendor flags, specialty coverage, mis-tags.
 *
 * Usage:
 *   npx tsx scripts/audit-service-vendors.ts
 *   npx tsx scripts/audit-service-vendors.ts --json
 *   npx tsx scripts/audit-service-vendors.ts --write-report
 *
 * Writes docs/service-vendor-audit-report.md with --write-report
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";
import { join } from "path";
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_SLUGS,
} from "../lib/service-categories/constants";
import {
  SERVICE_CATEGORY_GROUP_LABELS,
  SERVICE_CATEGORY_GROUP_MEMBERS,
} from "../lib/service-categories/groups";
import {
  looksLikeStorefrontBusinessType,
  suggestServiceCategoryFromBusinessType,
} from "../lib/service-categories/suggest-from-business-type";

dotenv.config({ path: ".env.local" });

const JSON_OUT = process.argv.includes("--json");
const WRITE_REPORT = process.argv.includes("--write-report");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type Row = {
  id: string;
  title: string;
  slug: string;
  business_type: string | null;
  is_service_business: boolean | null;
  is_storefront: boolean | null;
  service_category_id: string | null;
  service_categories: { slug: string; title: string } | { slug: string; title: string }[] | null;
  business_categories: { slug: string; title: string } | { slug: string; title: string }[] | null;
};

function catSlug(row: Row): string | null {
  const c = row.business_categories;
  const one = Array.isArray(c) ? c[0] : c;
  return one?.slug ?? null;
}

function specialtySlug(row: Row): string | null {
  const sc = row.service_categories;
  const one = Array.isArray(sc) ? sc[0] : sc;
  return one?.slug ?? null;
}

async function fetchAll(): Promise<Row[]> {
  const pageSize = 500;
  const all: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, title, slug, business_type, is_service_business, is_storefront, service_category_id, service_categories ( slug, title ), business_categories ( slug, title )",
      )
      .is("archived_at", null)
      .eq("status", "published")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as Row[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function mdSection(title: string, body: string): string {
  return `\n## ${title}\n\n${body}\n`;
}

async function main() {
  const rows = await fetchAll();
  const services = rows.filter((r) => r.is_service_business);
  const storefronts = rows.filter((r) => !r.is_service_business);

  const withSpecialty = services.filter((r) => r.service_category_id);
  const withoutSpecialty = services.filter((r) => !r.service_category_id);

  const misTagged: Row[] = [];
  const suggestGap: Row[] = [];
  const byBusinessType = new Map<string, number>();
  const bySpecialty = new Map<string, number>();
  const byStorefrontCat = new Map<string, number>();

  for (const r of rows) {
    const bt = (r.business_type ?? "").trim() || "(empty)";
    byBusinessType.set(bt, (byBusinessType.get(bt) ?? 0) + 1);
    const sc = specialtySlug(r);
    if (sc) bySpecialty.set(sc, (bySpecialty.get(sc) ?? 0) + 1);
    const pc = catSlug(r);
    if (pc) byStorefrontCat.set(pc, (byStorefrontCat.get(pc) ?? 0) + 1);
  }

  for (const r of services) {
    if (looksLikeStorefrontBusinessType(r.business_type)) misTagged.push(r);
    if (!r.service_category_id) {
      const hint = suggestServiceCategoryFromBusinessType(r.business_type);
      if (hint) suggestGap.push(r);
    }
  }

  const dbSlugs = new Set(
    (
      await supabase
        .from("service_categories")
        .select("slug")
        .is("archived_at", null)
        .eq("status", "published")
    ).data?.map((r) => (r as { slug: string }).slug) ?? [],
  );

  const missingInDb = SERVICE_CATEGORY_SLUGS.filter((s) => !dbSlugs.has(s));
  const extraInDb = [...dbSlugs].filter(
    (s) => !(SERVICE_CATEGORY_SLUGS as readonly string[]).includes(s),
  );

  const summary = {
    generated_at: new Date().toISOString(),
    total_published: rows.length,
    service_vendors: services.length,
    storefronts: storefronts.length,
    service_with_specialty: withSpecialty.length,
    service_without_specialty: withoutSpecialty.length,
    mis_tagged_service_count: misTagged.length,
    heuristic_unclassified: suggestGap.length,
    code_slugs: SERVICE_CATEGORY_SLUGS.length,
    db_published_slugs: dbSlugs.size,
    missing_slugs_in_db: missingInDb,
    extra_db_slugs_not_in_code: extraInDb,
  };

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          mis_tagged: misTagged.map((r) => ({
            title: r.title,
            slug: r.slug,
            business_type: r.business_type,
            storefront_cat: catSlug(r),
          })),
          unclassified_sample: withoutSpecialty.slice(0, 100).map((r) => ({
            title: r.title,
            business_type: r.business_type,
            suggested: suggestServiceCategoryFromBusinessType(r.business_type),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const lines: string[] = [
    "# Service vendor audit",
    "",
    `Generated: ${summary.generated_at}`,
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Published businesses | ${summary.total_published} |`,
    `| Service vendors (\`is_service_business\`) | ${summary.service_vendors} |`,
    `| Storefronts | ${summary.storefronts} |`,
    `| Service vendors with specialty | ${summary.service_with_specialty} |`,
    `| Service vendors **without** specialty | ${summary.service_without_specialty} |`,
    `| Likely mis-tagged (restaurant/hotel/retail \`business_type\`) | ${summary.mis_tagged_service_count} |`,
    `| Unclassified but heuristic suggests a slug | ${summary.heuristic_unclassified} |`,
    `| Code taxonomy slugs | ${summary.code_slugs} |`,
    `| DB published \`service_categories\` | ${summary.db_published_slugs} |`,
  ];

  if (missingInDb.length) {
    lines.push(
      mdSection(
        "Migrations needed",
        `Slugs in code but not in DB:\n\n${missingInDb.map((s) => `- \`${s}\``).join("\n")}\n\nApply \`20260604130400_service_categories_full_taxonomy.sql\` (and earlier service category migrations).`,
      ),
    );
  }

  if (extraInDb.length) {
    lines.push(
      mdSection(
        "DB slugs not in code",
        extraInDb.map((s) => `- \`${s}\``).join("\n"),
      ),
    );
  }

  lines.push(
    mdSection(
      "Taxonomy groups (code)",
      SERVICE_CATEGORY_SLUGS.map((slug) => {
        const group = Object.entries(SERVICE_CATEGORY_GROUP_MEMBERS).find(([, m]) =>
          (m as readonly string[]).includes(slug),
        )?.[0];
        return `- \`${slug}\` — ${SERVICE_CATEGORY_LABELS[slug]} (${group ? SERVICE_CATEGORY_GROUP_LABELS[group as keyof typeof SERVICE_CATEGORY_GROUP_LABELS] : "?"})`;
      }).join("\n"),
    ),
  );

  const topBt = [...byBusinessType.entries()]
    .filter(([k]) => k !== "(empty)")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);
  lines.push(
    mdSection(
      "Top business_type (all listings)",
      "| Count | business_type | Suggested specialty |\n|------:|---------------|---------------------|\n" +
        topBt
          .map(([bt, n]) => {
            const sug = suggestServiceCategoryFromBusinessType(bt);
            return `| ${n} | ${bt} | ${sug ?? "—"} |`;
          })
          .join("\n"),
    ),
  );

  lines.push(
    mdSection(
      "Specialty assignment counts (service vendors)",
      [...bySpecialty.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `- ${n} — \`${s}\``)
        .join("\n") || "_None assigned yet._",
    ),
  );

  lines.push(
    mdSection(
      "Storefront primary_category counts",
      [...byStorefrontCat.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `- ${n} — \`${s}\``)
        .join("\n"),
    ),
  );

  if (misTagged.length) {
    lines.push(
      mdSection(
        "Mis-tagged service vendors (review → set is_service_business=false)",
        misTagged
          .slice(0, 80)
          .map(
            (r) =>
              `- **${r.title}** (\`${r.slug}\`) — type: ${r.business_type ?? "—"}, cat: ${catSlug(r) ?? "—"}`,
          )
          .join("\n") + (misTagged.length > 80 ? `\n\n_…and ${misTagged.length - 80} more._` : ""),
      ),
    );
  }

  if (withoutSpecialty.length) {
    lines.push(
      mdSection(
        "Unclassified service vendors (sample)",
        withoutSpecialty
          .slice(0, 60)
          .map((r) => {
            const sug = suggestServiceCategoryFromBusinessType(r.business_type);
            return `- **${r.title}** — type: ${r.business_type ?? "—"}${sug ? ` → suggest \`${sug}\`` : ""}`;
          })
          .join("\n") +
          (withoutSpecialty.length > 60
            ? `\n\n_…and ${withoutSpecialty.length - 60} more without specialty._`
            : ""),
      ),
    );
  }

  const report = lines.join("\n");
  console.log(report);

  if (WRITE_REPORT) {
    const out = join(process.cwd(), "docs/service-vendor-audit-report.md");
    writeFileSync(out, report, "utf8");
    console.log(`\nWrote ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
