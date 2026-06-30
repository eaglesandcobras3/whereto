import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugifyBusinessTitle, uniqueSlug } from "@/lib/portal/slug";
import { isGuideEnriched } from "@/lib/guides/custom-fields";
import {
  estimateReadingTimeMinutes,
  validateGuideMarkdown,
} from "@/lib/guides/validate-markdown";

export const GUIDE_STATUSES = ["draft", "published", "archived"] as const;
export type GuideStatus = (typeof GUIDE_STATUSES)[number];

export const GUIDE_TYPES = ["editorial", "seasonal", "town", "intent"] as const;
export type GuideType = (typeof GUIDE_TYPES)[number];

export type AdminGuideListItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  guide_type: string | null;
  date_updated: string | null;
  enriched: boolean;
  town_name: string | null;
};

export type AdminGuideDetail = {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  guide_type: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  search_keywords: string | null;
  summary: string | null;
  excerpt: string | null;
  intent_tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  enriched: boolean;
  town_id: string | null;
  area_id: string | null;
  business_ids: string[];
  business_labels: Record<string, string>;
  date_updated: string | null;
  published_at: string | null;
};

export type GuideWriteInput = {
  title: string;
  slug?: string;
  content: string;
  status?: GuideStatus;
  guide_type?: GuideType;
  town_id?: string | null;
  area_id?: string | null;
  business_ids?: string[];
};

function parseIntentTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const tags = raw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  return tags.length ? tags : null;
}

export async function listAdminGuides(
  supabase: SupabaseClient,
  opts?: { status?: string; limit?: number },
): Promise<AdminGuideListItem[]> {
  const limit = opts?.limit ?? 100;
  let q = supabase
    .from("guides")
    .select("id, slug, title, status, guide_type, date_updated, custom_fields")
    .order("date_updated", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (opts?.status) q = q.eq("status", opts.status);

  const { data: guides } = await q;
  if (!guides?.length) return [];

  const ids = guides.map((g) => String((g as { id: string }).id));
  const { data: townLinks } = await supabase
    .from("guide_towns")
    .select("guide_id, towns ( name )")
    .in("guide_id", ids);

  const townByGuide = new Map<string, string>();
  for (const link of townLinks ?? []) {
    const gid = String((link as { guide_id: string }).guide_id);
    const name = (link.towns as { name?: string } | null)?.name;
    if (name && !townByGuide.has(gid)) townByGuide.set(gid, name);
  }

  return guides.map((g) => {
    const row = g as {
      id: string;
      slug: string;
      title: string;
      status: string;
      guide_type: string | null;
      date_updated: string | null;
      custom_fields: unknown;
    };
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      guide_type: row.guide_type,
      date_updated: row.date_updated,
      enriched: isGuideEnriched(row.custom_fields),
      town_name: townByGuide.get(row.id) ?? null,
    };
  });
}

export async function getAdminGuideById(
  supabase: SupabaseClient,
  id: string,
): Promise<AdminGuideDetail | null> {
  const { data: guide } = await supabase
    .from("guides")
    .select(
      "id, slug, title, content, status, guide_type, seo_title, seo_description, og_title, og_description, search_keywords, summary, excerpt, intent_tags, custom_fields, date_updated, published_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!guide) return null;

  const row = guide as {
    id: string;
    slug: string;
    title: string;
    content: string | null;
    status: string;
    guide_type: string | null;
    seo_title: string | null;
    seo_description: string | null;
    og_title: string | null;
    og_description: string | null;
    search_keywords: string | null;
    summary: string | null;
    excerpt: string | null;
    intent_tags: unknown;
    custom_fields: unknown;
    date_updated: string | null;
    published_at: string | null;
  };

  const [townRes, areaRes, bizRes] = await Promise.all([
    supabase.from("guide_towns").select("town_id").eq("guide_id", id).limit(1).maybeSingle(),
    supabase.from("guide_areas").select("area_id").eq("guide_id", id).limit(1).maybeSingle(),
    supabase
      .from("guide_businesses")
      .select("business_id, businesses ( title )")
      .eq("guide_id", id),
  ]);

  const business_ids: string[] = [];
  const business_labels: Record<string, string> = {};
  for (const link of bizRes.data ?? []) {
    const bid = String((link as { business_id: string }).business_id);
    business_ids.push(bid);
    const label = (link.businesses as { title?: string } | null)?.title;
    if (label) business_labels[bid] = label;
  }

  const cf =
    row.custom_fields && typeof row.custom_fields === "object" && !Array.isArray(row.custom_fields)
      ? (row.custom_fields as Record<string, unknown>)
      : null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content ?? "",
    status: row.status,
    guide_type: row.guide_type,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    og_title: row.og_title,
    og_description: row.og_description,
    search_keywords: row.search_keywords,
    summary: row.summary,
    excerpt: row.excerpt,
    intent_tags: parseIntentTags(row.intent_tags),
    custom_fields: cf,
    enriched: isGuideEnriched(row.custom_fields),
    town_id: (townRes.data as { town_id?: string } | null)?.town_id ?? null,
    area_id: (areaRes.data as { area_id?: string } | null)?.area_id ?? null,
    business_ids,
    business_labels,
    date_updated: row.date_updated,
    published_at: row.published_at,
  };
}

async function resolveUniqueSlug(
  supabase: SupabaseClient,
  title: string,
  explicit?: string,
  excludeId?: string,
): Promise<string> {
  const base = explicit?.trim() || slugifyBusinessTitle(title);
  if (!base) throw new Error("Could not derive slug from title.");

  let q = supabase.from("guides").select("id, slug");
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  const taken = new Set(
    (data ?? [])
      .filter((r) => !excludeId || String((r as { id: string }).id) !== excludeId)
      .map((r) => String((r as { slug: string }).slug)),
  );
  return uniqueSlug(base, taken);
}

export async function syncGuideTowns(
  supabase: SupabaseClient,
  guideId: string,
  townId: string | null,
): Promise<void> {
  await supabase.from("guide_towns").delete().eq("guide_id", guideId);
  if (!townId) return;
  const { error } = await supabase.from("guide_towns").insert({
    id: randomUUID(),
    guide_id: guideId,
    town_id: townId,
  });
  if (error) throw new Error(error.message);
}

export async function syncGuideAreas(
  supabase: SupabaseClient,
  guideId: string,
  areaId: string | null,
): Promise<void> {
  await supabase.from("guide_areas").delete().eq("guide_id", guideId);
  if (!areaId) return;
  const { error } = await supabase.from("guide_areas").insert({
    id: randomUUID(),
    guide_id: guideId,
    area_id: areaId,
  });
  if (error) throw new Error(error.message);
}

export async function syncGuideBusinesses(
  supabase: SupabaseClient,
  guideId: string,
  businessIds: string[],
): Promise<void> {
  await supabase.from("guide_businesses").delete().eq("guide_id", guideId);
  const ids = [...new Set(businessIds.filter(Boolean))];
  if (!ids.length) return;
  const rows = ids.map((business_id, i) => ({
    id: randomUUID(),
    guide_id: guideId,
    business_id,
    sort: i,
  }));
  const { error } = await supabase.from("guide_businesses").insert(rows);
  if (error) throw new Error(error.message);
}

export function assertCanPublish(
  status: GuideStatus,
  customFields: unknown,
  currentStatus?: string,
): string | null {
  if (status !== "published") return null;
  if (currentStatus === "published") return null;
  if (!isGuideEnriched(customFields)) {
    return "Guide must be enriched before publishing. Run Enrich first.";
  }
  return null;
}

export async function createAdminGuide(
  supabase: SupabaseClient,
  input: GuideWriteInput,
): Promise<{ id: string; slug: string }> {
  const mdCheck = validateGuideMarkdown(input.content);
  if (!mdCheck.ok) throw new Error(mdCheck.error);

  const slug = await resolveUniqueSlug(supabase, input.title, input.slug);
  const now = new Date().toISOString();
  const status: GuideStatus = input.status ?? "draft";
  if (status === "published") {
    throw new Error(
      "Guide must be enriched before publishing. Save as draft, run Enrich, then publish.",
    );
  }
  const id = randomUUID();

  const { error } = await supabase.from("guides").insert({
    id,
    slug,
    title: input.title.trim(),
    content: input.content.trim(),
    status,
    guide_type: input.guide_type ?? "editorial",
    reading_time_minutes: estimateReadingTimeMinutes(input.content),
    date_created: now,
    date_updated: now,
    published_at: null,
  });
  if (error) throw new Error(error.message);

  await syncGuideTowns(supabase, id, input.town_id ?? null);
  await syncGuideAreas(supabase, id, input.area_id ?? null);
  await syncGuideBusinesses(supabase, id, input.business_ids ?? []);

  return { id, slug };
}

export async function updateAdminGuide(
  supabase: SupabaseClient,
  id: string,
  input: GuideWriteInput,
): Promise<{ slug: string }> {
  const existing = await getAdminGuideById(supabase, id);
  if (!existing) throw new Error("Guide not found.");

  const mdCheck = validateGuideMarkdown(input.content);
  if (!mdCheck.ok) throw new Error(mdCheck.error);

  const nextStatus: GuideStatus = input.status ?? (existing.status as GuideStatus);
  const publishErr = assertCanPublish(nextStatus, existing.custom_fields, existing.status);
  if (publishErr) throw new Error(publishErr);

  const slug = input.slug?.trim()
    ? await resolveUniqueSlug(supabase, input.title, input.slug, id)
    : existing.slug;

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    title: input.title.trim(),
    slug,
    content: input.content.trim(),
    status: nextStatus,
    guide_type: input.guide_type ?? existing.guide_type ?? "editorial",
    reading_time_minutes: estimateReadingTimeMinutes(input.content),
    date_updated: now,
  };

  if (nextStatus === "published" && existing.status !== "published") {
    patch.published_at = now;
  }
  if (nextStatus !== "published") {
    patch.published_at = null;
  }

  const { error } = await supabase.from("guides").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  await syncGuideTowns(supabase, id, input.town_id ?? null);
  await syncGuideAreas(supabase, id, input.area_id ?? null);
  await syncGuideBusinesses(supabase, id, input.business_ids ?? []);

  return { slug };
}

export type GuidePickerOption = { id: string; label: string; sublabel?: string };

export async function listTownPickerOptions(
  supabase: SupabaseClient,
): Promise<GuidePickerOption[]> {
  const { data } = await supabase
    .from("towns")
    .select("id, name, slug")
    .order("name", { ascending: true });
  return (data ?? []).map((r) => ({
    id: String((r as { id: string }).id),
    label: String((r as { name: string }).name),
    sublabel: String((r as { slug: string }).slug),
  }));
}

export async function listAreaPickerOptions(
  supabase: SupabaseClient,
  townId?: string | null,
): Promise<GuidePickerOption[]> {
  let q = supabase.from("areas").select("id, name, slug, town_id").order("name", {
    ascending: true,
  });
  if (townId) q = q.eq("town_id", townId);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: String((r as { id: string }).id),
    label: String((r as { name: string }).name),
    sublabel: String((r as { slug: string }).slug),
  }));
}

export async function searchBusinessPickerOptions(
  supabase: SupabaseClient,
  query: string,
  limit = 20,
): Promise<GuidePickerOption[]> {
  const q = query.trim();
  if (!q) return [];
  const pattern = `%${q.replace(/%/g, "")}%`;
  const { data } = await supabase
    .from("businesses")
    .select("id, title, slug, towns ( name )")
    .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(limit);
  return (data ?? []).map((r) => {
    const town = (r.towns as { name?: string } | null)?.name;
    return {
      id: String((r as { id: string }).id),
      label: String((r as { title: string }).title),
      sublabel: town ? `${town} · ${(r as { slug: string }).slug}` : String((r as { slug: string }).slug),
    };
  });
}
