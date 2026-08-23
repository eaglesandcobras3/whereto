import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeTagSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type AdminTagRow = {
  tag: string;
  description: string | null;
  category_slugs: string[];
};

export const adminTagPatchSchema = z.object({
  description: z
    .string()
    .max(500)
    .optional()
    .transform((s) => {
      if (s === undefined) return undefined;
      const t = s.trim();
      return t === "" ? null : t;
    }),
});

export const adminTagCreateSchema = z.object({
  tag: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .transform((s) => normalizeTagSlug(s)),
  description: z
    .string()
    .max(500)
    .optional()
    .transform((s) => {
      if (s === undefined) return null;
      const t = s.trim();
      return t === "" ? null : t;
    }),
});

export async function listAdminTags(
  supabase: SupabaseClient,
  query?: string,
): Promise<AdminTagRow[]> {
  const { data: tags, error } = await supabase
    .from("search_tags_vocabulary")
    .select("tag, description")
    .order("tag", { ascending: true });
  if (error) throw error;

  const { data: mappings } = await supabase
    .from("search_tag_categories")
    .select("tag, business_categories ( slug )");

  const categoriesByTag = new Map<string, string[]>();
  for (const row of mappings ?? []) {
    const tag = String((row as { tag: string }).tag);
    const slug = (row as { business_categories?: { slug?: string } | null }).business_categories
      ?.slug;
    if (!slug) continue;
    const list = categoriesByTag.get(tag) ?? [];
    list.push(String(slug));
    categoriesByTag.set(tag, list);
  }

  const needle = query?.trim().toLowerCase() ?? "";
  return (tags ?? [])
    .map((row) => {
      const tag = String((row as { tag: string }).tag);
      return {
        tag,
        description:
          (row as { description?: string | null }).description != null
            ? String((row as { description: string }).description)
            : null,
        category_slugs: categoriesByTag.get(tag) ?? [],
      };
    })
    .filter((row) => {
      if (!needle) return true;
      return (
        row.tag.includes(needle) ||
        (row.description?.toLowerCase().includes(needle) ?? false)
      );
    });
}

export async function updateAdminTag(
  supabase: SupabaseClient,
  tag: string,
  input: z.infer<typeof adminTagPatchSchema>,
): Promise<AdminTagRow> {
  const patch: Record<string, unknown> = {};
  if (input.description !== undefined) patch.description = input.description;
  const { error } = await supabase.from("search_tags_vocabulary").update(patch).eq("tag", tag);
  if (error) throw error;
  const rows = await listAdminTags(supabase);
  const found = rows.find((r) => r.tag === tag);
  if (!found) throw new Error("Tag not found after update");
  return found;
}

export async function createAdminTag(
  supabase: SupabaseClient,
  input: z.infer<typeof adminTagCreateSchema>,
): Promise<AdminTagRow> {
  const { error } = await supabase.from("search_tags_vocabulary").insert({
    tag: input.tag,
    description: input.description,
  });
  if (error) throw error;
  const rows = await listAdminTags(supabase);
  const found = rows.find((r) => r.tag === input.tag);
  if (!found) throw new Error("Tag not found after create");
  return found;
}
