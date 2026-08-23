import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AT_A_GLANCE_FACTS_SELECT } from "@/lib/data/at-a-glance-facts";
import { mainImagePatch } from "@/lib/admin/guides";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { slugifyBusinessTitle, uniqueSlug } from "@/lib/portal/slug";

export const PLACE_STATUSES = ["draft", "published", "archived"] as const;

function nullableText(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((s) => {
      if (s === undefined) return undefined;
      const t = s.trim();
      return t === "" ? null : t;
    });
}

const factsFields = {
  at_a_glance_description: nullableText(2000),
  walkability_rating: nullableText(120),
  walkability_subtext: nullableText(240),
  beach_type: nullableText(120),
  beach_type_subtext: nullableText(240),
  dining_rating: nullableText(120),
  dining_subtext: nullableText(240),
  getting_around_summary: nullableText(120),
  getting_around_subtext: nullableText(240),
  highlights: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  beach_access_details: nullableText(2000),
  getting_around_details: nullableText(2000),
  dining_town_center_details: nullableText(2000),
  parking_details: nullableText(2000),
};

export const adminTownPatchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  slug: z.string().trim().min(2).max(120).optional(),
  excerpt: nullableText(500),
  content: nullableText(12000),
  seo_title: nullableText(60),
  seo_description: nullableText(160),
  status: z.enum(PLACE_STATUSES).optional(),
  map_lat: z.union([z.number().finite(), z.null()]).optional(),
  map_lng: z.union([z.number().finite(), z.null()]).optional(),
  main_image_url: z.union([z.string().max(500), z.null()]).optional(),
  ...factsFields,
});

export type AdminTownRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: string | null;
  map_lat: number | null;
  map_lng: number | null;
  main_image_url: string | null;
  hero_image_url: string | null;
  date_created: string | null;
  date_updated: string | null;
} & Record<string, unknown>;

export const ADMIN_TOWN_SELECT = [
  "id",
  "title",
  "slug",
  "excerpt",
  "content",
  "seo_title",
  "seo_description",
  "status",
  "map_lat",
  "map_lng",
  "main_image_url",
  "hero_image_url",
  "date_created",
  "date_updated",
  AT_A_GLANCE_FACTS_SELECT,
].join(", ");

export type AdminTownListItem = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  date_updated: string | null;
};

export async function searchTownsForAdmin(
  supabase: SupabaseClient,
  query: string,
  limit = 20,
): Promise<AdminTownListItem[]> {
  const q = query.trim().replace(/[%_,]/g, "");
  if (q.length < 2) return [];
  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("towns")
    .select("id, title, slug, status, date_updated")
    .is("archived_at", null)
    .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
    .order("title", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    status: row.status != null ? String(row.status) : null,
    date_updated: row.date_updated != null ? String(row.date_updated) : null,
  }));
}

export async function resolveTownIdForAdmin(
  supabase: SupabaseClient,
  ref: string,
): Promise<string | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
  const col = uuidLike ? "id" : "slug";
  const { data } = await supabase
    .from("towns")
    .select("id")
    .eq(col, trimmed)
    .is("archived_at", null)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function getAdminTownById(
  supabase: SupabaseClient,
  id: string,
): Promise<AdminTownRow | null> {
  const { data, error } = await supabase
    .from("towns")
    .select(ADMIN_TOWN_SELECT)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as AdminTownRow | null) ?? null;
}

export async function createAdminTown(
  supabase: SupabaseClient,
  input: { title: string; slug?: string },
): Promise<AdminTownRow> {
  const title = input.title.trim();
  const baseSlug = slugifyBusinessTitle(input.slug?.trim() || title);
  const { data: taken } = await supabase.from("towns").select("slug").is("archived_at", null);
  const slug = uniqueSlug(
    baseSlug,
    (taken ?? []).map((r) => String((r as { slug: string }).slug)),
  );
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("towns")
    .insert({
      title,
      slug,
      status: "draft",
      date_created: now,
      date_updated: now,
    })
    .select(ADMIN_TOWN_SELECT)
    .single();
  if (error) throw error;
  return data as AdminTownRow;
}

export function buildAdminTownPatch(
  input: z.infer<typeof adminTownPatchSchema>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { date_updated: new Date().toISOString() };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === "main_image_url") {
      Object.assign(patch, mainImagePatch(value as string | null));
      if (value) patch.hero_image_url = value;
      continue;
    }
    patch[key] = value;
  }
  if (input.status === "published" && !patch.published_at) {
    patch.published_at = new Date().toISOString();
  }
  return patch;
}

export async function updateAdminTown(
  supabase: SupabaseClient,
  id: string,
  input: z.infer<typeof adminTownPatchSchema>,
): Promise<AdminTownRow> {
  const patch = buildAdminTownPatch(input);
  const { data, error } = await supabase
    .from("towns")
    .update(patch)
    .eq("id", id)
    .select(ADMIN_TOWN_SELECT)
    .single();
  if (error) throw error;
  return data as AdminTownRow;
}

export async function listRecentTownsForAdmin(
  supabase: SupabaseClient,
  limit = 50,
): Promise<AdminTownListItem[]> {
  const { data, error } = await supabase
    .from("towns")
    .select("id, title, slug, status, date_updated")
    .is("archived_at", null)
    .order("date_updated", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    status: row.status != null ? String(row.status) : null,
    date_updated: row.date_updated != null ? String(row.date_updated) : null,
  }));
}

export { DIRECTUS_PUBLISHED_STATUS };
