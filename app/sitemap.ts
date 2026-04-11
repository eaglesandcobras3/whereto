import type { MetadataRoute } from "next";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import {
  PRIMARY_REGION_DB_SLUG,
  PRIMARY_REGION_HUB_PATH,
} from "@/lib/routes/primary-region";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return [
      {
        url: `${base}/`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 1,
      },
    ];
  }

  const [{ data: towns }, { data: regions }, { data: seo }, { data: businesses }] =
    await Promise.all([
      supabase.from("towns").select("slug"),
      supabase.from("regions").select("slug"),
      supabase
        .from("seo_pages")
        .select("slug, updated_at")
        .eq("published", true),
      supabase
        .from("businesses")
        .select("slug, updated_at")
        .eq("status", "active")
        .eq("admin_suppressed", false)
        .limit(5000),
    ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/guide`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${base}${PRIMARY_REGION_HUB_PATH}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.88,
    },
  ];

  // Guide pages for each town (high SEO value)
  for (const t of towns ?? []) {
    const slug = t.slug as string;
    if (!slug) continue;
    entries.push({
      url: `${base}/guide/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.92,
    });
  }

  for (const t of towns ?? []) {
    const slug = t.slug as string;
    if (!slug || isReservedRootSlug(slug)) continue;
    entries.push({
      url: `${base}/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  for (const r of regions ?? []) {
    const slug = r.slug as string;
    if (!slug || isReservedRootSlug(slug)) continue;
    if (slug === PRIMARY_REGION_DB_SLUG) continue;
    entries.push({
      url: `${base}/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  for (const row of seo ?? []) {
    const slug = row.slug as string;
    if (!slug) continue;
    const lm = row.updated_at
      ? new Date(row.updated_at as string)
      : now;
    entries.push({
      url: `${base}/${slug}`,
      lastModified: lm,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const b of businesses ?? []) {
    const slug = b.slug as string;
    if (!slug) continue;
    const lm = b.updated_at
      ? new Date(b.updated_at as string)
      : now;
    entries.push({
      url: `${base}/business/${slug}`,
      lastModified: lm,
      changeFrequency: "monthly",
      priority: 0.65,
    });
  }

  return entries;
}
