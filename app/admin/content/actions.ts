"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import matter from "gray-matter";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

function normalizeStatus(raw: string): "draft" | "published" | "archived" {
  if (raw === "published" || raw === "archived") return raw;
  return "draft";
}

export async function upsertContentEntryAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const id = String(formData.get("id") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const bodyMarkdown = String(formData.get("body_markdown") ?? "").trim() || null;
  const seoTitle = String(formData.get("seo_title") ?? "").trim() || null;
  const seoDescription = String(formData.get("seo_description") ?? "").trim() || null;
  const ogImageUrl = String(formData.get("og_image_url") ?? "").trim() || null;
  const status = normalizeStatus(String(formData.get("status") ?? "draft"));
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  if (!contentType || !slug || !title) {
    redirect("/admin/content/new");
  }

  const basePayload = {
    content_type: contentType,
    slug,
    title,
    excerpt,
    body_markdown: bodyMarkdown,
    seo_title: seoTitle,
    seo_description: seoDescription,
    og_image_url: ogImageUrl,
    status,
    published_at: publishedAt,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("content_entries").update(basePayload).eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await supabase
      .from("content_entries")
      .insert(basePayload)
      .select("id")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    savedId = data.id as string;
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${savedId}`);
  revalidatePath("/guide");
  redirect(`/admin/content/${savedId}`);
}

export async function deleteContentEntryAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  await supabase.from("content_entries").delete().eq("id", id);
  revalidatePath("/admin/content");
}

type ParsedFrontmatter = {
  title?: string;
  type?: string;
  slug?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  status?: string;
  town?: string;
  area?: string;
  region?: string;
  tags?: string[];
  guide_type?: string;
  season?: string;
  featured?: boolean;
  event_date?: string;
  end_date?: string;
  recurrence_frequency?: "weekly";
  recurrence_weekday?: number;
  venue_name?: string;
  price?: string;
  website?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  map_center?: { lat?: number; lng?: number };
  map_location?: { lat?: number; lng?: number };
  family_friendly_score?: number;
  romance_score?: number;
  nightlife_score?: number;
  budget_score?: number;
  include_in_site_browse?: boolean;
};

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeMarkdownStatus(raw: string | undefined): "draft" | "published" | "archived" {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "published" || s === "archived" || s === "draft") return s;
  return "published";
}

export async function ingestMarkdownContentAction(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; slug?: string; type?: string }> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const raw = String(formData.get("markdown") ?? "");
  if (!raw.trim()) return { error: "Markdown is required." };

  let parsed: { data: ParsedFrontmatter; content: string };
  try {
    const m = matter(raw);
    parsed = { data: (m.data as ParsedFrontmatter) ?? {}, content: m.content ?? "" };
  } catch (error) {
    return { error: `Could not parse frontmatter: ${error instanceof Error ? error.message : "unknown error"}` };
  }

  const fm = parsed.data;
  const type = (fm.type ?? "").trim();
  const slug = (fm.slug ?? "").trim();
  const title = (fm.title ?? "").trim();
  if (!type || !slug || !title) {
    return { error: "Frontmatter must include `type`, `slug`, and `title`." };
  }
  if (!["guide", "seasonal", "town", "event"].includes(type)) {
    return { error: "Supported markdown ingest types are: guide, seasonal, town, event." };
  }

  const townSlug = (fm.town ?? "").trim();
  let townId: number | null = null;
  if (townSlug) {
    const { data: townRow } = await supabase.from("towns").select("id").eq("slug", townSlug).maybeSingle();
    townId = (townRow?.id as number | undefined) ?? null;
  }
  const lat = asNumber(fm.latitude) ?? asNumber(fm.map_center?.lat) ?? asNumber(fm.map_location?.lat);
  const lng = asNumber(fm.longitude) ?? asNumber(fm.map_center?.lng) ?? asNumber(fm.map_location?.lng);
  const status = normalizeMarkdownStatus(fm.status);
  const summary = (fm.seo_description ?? "").trim() || parsed.content.slice(0, 500).replace(/[#*\[\]`]/g, "");

  if (type === "town") {
    const centerLat = lat ?? 30.3;
    const centerLng = lng ?? -86.1;
    const { error: townErr } = await supabase.from("towns").upsert(
      {
        name: title,
        slug,
        center_lat: centerLat,
        center_lng: centerLng,
        search_radius_meters: 5000,
        ai_tagline: (fm.seo_description ?? "").trim().slice(0, 100) || null,
        ai_description: summary || null,
        ai_family_score: fm.family_friendly_score ?? null,
        ai_romance_score: fm.romance_score ?? null,
        ai_nightlife_score: fm.nightlife_score ?? null,
        ai_budget_score: fm.budget_score ?? null,
        ai_vibe: fm.tags ?? null,
      },
      { onConflict: "slug" },
    );
    if (townErr) return { error: `Town upsert failed: ${townErr.message}` };

    const { error: pageErr } = await supabase.from("pages").upsert(
      {
        slug,
        page_type: "town",
        title,
        body_markdown: parsed.content,
        seo_title: (fm.seo_title ?? "").trim() || null,
        seo_description: (fm.seo_description ?? "").trim() || null,
        seo_keywords: fm.seo_keywords ?? null,
        status,
      },
      { onConflict: "slug" },
    );
    if (pageErr) return { error: `Town page upsert failed: ${pageErr.message}` };
  }

  if (type === "guide" || type === "seasonal") {
    const guideType = (fm.guide_type ?? (type === "seasonal" ? "seasonal" : "editorial")).trim();
    const { error: guideErr } = await supabase.from("guides").upsert(
      {
        slug,
        title,
        guide_type: guideType,
        primary_town_id: townId,
        season: fm.season ?? null,
        featured: fm.featured === true,
      },
      { onConflict: "slug" },
    );
    if (guideErr) return { error: `Guide upsert failed: ${guideErr.message}` };

    const { error: pageErr } = await supabase.from("pages").upsert(
      {
        slug,
        page_type: "guide",
        title,
        body_markdown: parsed.content,
        seo_title: (fm.seo_title ?? "").trim() || null,
        seo_description: (fm.seo_description ?? "").trim() || null,
        seo_keywords: fm.seo_keywords ?? null,
        status,
      },
      { onConflict: "slug" },
    );
    if (pageErr) return { error: `Guide page upsert failed: ${pageErr.message}` };
  }

  if (type === "event") {
    if (!fm.event_date) return { error: "Event frontmatter requires `event_date` (YYYY-MM-DD)." };
    const rf = fm.recurrence_frequency;
    const rw = fm.recurrence_weekday;
    if ((rf != null) !== (rw != null)) {
      return { error: "Set both `recurrence_frequency` and `recurrence_weekday`, or neither." };
    }
    if (rf === "weekly" && (typeof rw !== "number" || !Number.isInteger(rw) || rw < 0 || rw > 6)) {
      return { error: "`recurrence_weekday` must be an integer 0-6 when recurrence_frequency is weekly." };
    }
    const { error: eventErr } = await supabase.from("events").upsert(
      {
        slug,
        title,
        description: summary || null,
        event_date: fm.event_date,
        end_date: fm.end_date ?? null,
        recurrence_frequency: rf ?? null,
        recurrence_weekday: rw ?? null,
        town_id: townId,
        venue_name: fm.venue_name ?? null,
        address: (fm.address ?? "").trim() || null,
        lat,
        lng,
        price: fm.price ?? null,
        website: (fm.website ?? "").trim() || null,
        tags: fm.tags ?? null,
        status: "active",
      },
      { onConflict: "slug" },
    );
    if (eventErr) return { error: `Event upsert failed: ${eventErr.message}` };
  }

  await supabase.from("content_entries").upsert(
    {
      content_type: type === "seasonal" ? "seasonal" : type,
      slug,
      title,
      excerpt: (fm.seo_description ?? "").trim() || null,
      body_markdown: parsed.content,
      seo_title: (fm.seo_title ?? "").trim() || null,
      seo_description: (fm.seo_description ?? "").trim() || null,
      seo_keywords: fm.seo_keywords ?? null,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      custom_fields_json: fm as unknown as Record<string, unknown>,
    },
    { onConflict: "content_type,slug" },
  );

  revalidatePath("/admin/content");
  revalidatePath(`/guide/${slug}`);
  revalidatePath(`/${slug}`);
  revalidatePath(`/events/${slug}`);
  return { ok: true, slug, type };
}

