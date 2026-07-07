import "server-only";
import { isMissingRelationError } from "@/lib/postgrest-errors";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export type ContentEntry = {
  id: string;
  content_type: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_markdown: string | null;
  body_rich: Record<string, unknown>;
  custom_fields_json: Record<string, unknown>;
  blocks_json: unknown[];
  status: "draft" | "published" | "archived";
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  og_image_url: string | null;
  legacy_page_slug: string | null;
  updated_at: string;
};

export async function listContentEntries(options?: {
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = getServiceSupabase();
  let q = supabase
    .from("content_entries")
    .select(
      "id, content_type, slug, title, status, published_at, updated_at, seo_title, seo_description",
    )
    .order("updated_at", { ascending: false });
  if (options?.type) q = q.eq("content_type", options.type);
  if (options?.offset && options.offset > 0) {
    q = q.range(options.offset, options.offset + (options?.limit ?? 200) - 1);
  } else if (options?.limit) {
    q = q.limit(options.limit);
  }
  const { data, error } = await q;
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function listContentEntriesPage(options?: {
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = getServiceSupabase();
  const limit = options?.limit ?? 25;
  const offset = options?.offset ?? 0;
  let q = supabase
    .from("content_entries")
    .select(
      "id, content_type, slug, title, status, published_at, updated_at, seo_title, seo_description",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (options?.type) q = q.eq("content_type", options.type);
  const { data, count, error } = await q;
  if (error) {
    if (isMissingRelationError(error)) return { entries: [], total: 0 };
    throw error;
  }
  return { entries: data ?? [], total: count ?? 0 };
}

export async function listContentEntryTypes(): Promise<string[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("content_entries")
    .select("content_type");
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  const uniq = new Set(
    (data ?? [])
      .map((row) => String(row.content_type ?? "").trim())
      .filter(Boolean),
  );
  return Array.from(uniq).sort((a, b) => a.localeCompare(b));
}

export async function getContentEntryById(id: string): Promise<ContentEntry | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("content_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
  return (data as ContentEntry | null) ?? null;
}

export async function getPublishedContentEntryBySlug(
  contentType: string,
  slug: string,
): Promise<ContentEntry | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("content_entries")
    .select("*")
    .eq("content_type", contentType)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
  return (data as ContentEntry | null) ?? null;
}

/** When a guide slug is archived in content_entries, do not fall back to a stale `guides` row. */
export async function isGuideArchivedInContentEntries(slug: string): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("content_entries")
    .select("status")
    .eq("content_type", "guide")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) return false;
    throw error;
  }
  const status = (data as { status?: string } | null)?.status;
  return status === "archived" || status === "draft";
}

