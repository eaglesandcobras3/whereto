import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AT_A_GLANCE_FACTS_SELECT } from "@/lib/data/at-a-glance-facts";
import { mainImagePatch } from "@/lib/admin/guides";
import { slugifyBusinessTitle, uniqueSlug } from "@/lib/portal/slug";
import { AREA_TYPES, PLACE_STATUSES } from "@/lib/admin/place-constants";
import { queryRowWithSelectFallback, isOptionalSchemaColumnError } from "@/lib/admin/admin-place-query";

export { AREA_TYPES, PLACE_STATUSES };

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

export const adminAreaPatchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  slug: z.string().trim().min(2).max(120).optional(),
  town_id: z.union([z.string().uuid(), z.null()]).optional(),
  area_type: z.enum(AREA_TYPES).optional(),
  excerpt: nullableText(500),
  content: nullableText(12000),
  seo_description: nullableText(160),
  parking_notes: nullableText(1000),
  include_in_site_browse: z.boolean().optional(),
  status: z.enum(PLACE_STATUSES).optional(),
  map_lat: z.union([z.number().finite(), z.null()]).optional(),
  map_lng: z.union([z.number().finite(), z.null()]).optional(),
  main_image_url: z.union([z.string().max(500), z.null()]).optional(),
  ...factsFields,
});

export type AdminAreaRow = {
  id: string;
  title: string;
  slug: string;
  town_id: string | null;
  area_type: string | null;
  excerpt: string | null;
  content: string | null;
  seo_description: string | null;
  parking_notes: string | null;
  include_in_site_browse: boolean | null;
  status: string | null;
  map_lat: number | null;
  map_lng: number | null;
  main_image_url: string | null;
  hero_image_url: string | null;
  date_created: string | null;
  date_updated: string | null;
} & Record<string, unknown>;

export const ADMIN_AREA_SELECT = [
  "id",
  "title",
  "slug",
  "town_id",
  "area_type",
  "excerpt",
  "content",
  "seo_description",
  "parking_notes",
  "include_in_site_browse",
  "status",
  "map_lat",
  "map_lng",
  "main_image_url",
  "hero_image_url",
  "date_created",
  "date_updated",
  AT_A_GLANCE_FACTS_SELECT,
].join(", ");

/** Without hub flag or at-a-glance facts (older DBs). */
export const ADMIN_AREA_SELECT_LEGACY = [
  "id",
  "title",
  "slug",
  "town_id",
  "area_type",
  "excerpt",
  "content",
  "seo_description",
  "parking_notes",
  "status",
  "map_lat",
  "map_lng",
  "main_image_url",
  "hero_image_url",
  "date_created",
  "date_updated",
].join(", ");

export type AdminAreaListItem = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  town_title: string | null;
  date_updated: string | null;
};

export async function searchAreasForAdmin(
  supabase: SupabaseClient,
  query: string,
  limit = 20,
  townId?: string | null,
): Promise<AdminAreaListItem[]> {
  const q = query.trim().replace(/[%_,]/g, "");
  if (q.length < 2) return [];
  const pattern = `%${q}%`;
  let req = supabase
    .from("areas")
    .select("id, title, slug, status, date_updated, towns ( title )")
    .is("archived_at", null)
    .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
    .order("title", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (townId) req = req.eq("town_id", townId);
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const townRel = row.towns as { title?: string } | { title?: string }[] | null;
    const town = Array.isArray(townRel) ? townRel[0] : townRel;
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      slug: String(row.slug ?? ""),
      status: row.status != null ? String(row.status) : null,
      town_title: town?.title ? String(town.title) : null,
      date_updated: row.date_updated != null ? String(row.date_updated) : null,
    };
  });
}

export async function resolveAreaIdForAdmin(
  supabase: SupabaseClient,
  ref: string,
): Promise<string | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
  const col = uuidLike ? "id" : "slug";
  const { data } = await supabase
    .from("areas")
    .select("id")
    .eq(col, trimmed)
    .is("archived_at", null)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function getAdminAreaById(
  supabase: SupabaseClient,
  ref: string,
): Promise<AdminAreaRow | null> {
  const id = await resolveAreaIdForAdmin(supabase, ref);
  if (!id) return null;

  const { data, error } = await queryRowWithSelectFallback<AdminAreaRow>({
    selectVariants: [ADMIN_AREA_SELECT, ADMIN_AREA_SELECT_LEGACY],
    run: (select) =>
      supabase.from("areas").select(select).eq("id", id).is("archived_at", null).maybeSingle(),
  });
  if (error) throw error;
  return data ?? null;
}

export async function createAdminArea(
  supabase: SupabaseClient,
  input: { title: string; slug?: string; town_id?: string | null },
): Promise<AdminAreaRow> {
  const title = input.title.trim();
  const baseSlug = slugifyBusinessTitle(input.slug?.trim() || title);
  const { data: taken } = await supabase.from("areas").select("slug").is("archived_at", null);
  const slug = uniqueSlug(
    baseSlug,
    new Set((taken ?? []).map((r) => String((r as { slug: string }).slug))),
  );
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("areas")
    .insert({
      title,
      slug,
      town_id: input.town_id ?? null,
      area_type: "neighborhood",
      include_in_site_browse: false,
      status: "draft",
      date_created: now,
      date_updated: now,
    })
    .select(ADMIN_AREA_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as AdminAreaRow;
}

export function buildAdminAreaPatch(
  input: z.infer<typeof adminAreaPatchSchema>,
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

export async function updateAdminArea(
  supabase: SupabaseClient,
  ref: string,
  input: z.infer<typeof adminAreaPatchSchema>,
): Promise<AdminAreaRow> {
  const id = await resolveAreaIdForAdmin(supabase, ref);
  if (!id) throw new Error("Area not found");

  const patch = buildAdminAreaPatch(input);
  const { data, error } = await supabase
    .from("areas")
    .update(patch)
    .eq("id", id)
    .select(ADMIN_AREA_SELECT)
    .single();

  if (error?.message && isOptionalSchemaColumnError(error.message)) {
    const legacyPatch = { ...patch };
    delete legacyPatch.include_in_site_browse;
    for (const key of Object.keys(legacyPatch)) {
      if (key.startsWith("at_a_glance_") || key.endsWith("_details") || key === "highlights") {
        delete legacyPatch[key];
      }
    }
    const retry = await supabase
      .from("areas")
      .update(legacyPatch)
      .eq("id", id)
      .select(ADMIN_AREA_SELECT_LEGACY)
      .single();
    if (retry.error) throw retry.error;
    return retry.data as unknown as AdminAreaRow;
  }

  if (error) throw error;
  return data as unknown as AdminAreaRow;
}
