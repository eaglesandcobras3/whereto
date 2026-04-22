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
  area_type?: string;
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
  phone?: string;
  price_range?: string;
  category?: string;
  category_slug?: string;
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
): Promise<{ ok?: boolean; error?: string; slug?: string; type?: string; warnings?: string[] }> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const raw = String(formData.get("markdown") ?? "");
  if (!raw.trim()) return { error: "Markdown is required." };
  const intent = String(formData.get("intent") ?? "process");

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
  if (!["guide", "seasonal", "town", "event", "area", "business", "service"].includes(type)) {
    return { error: "Supported markdown ingest types are: guide, seasonal, town, event, area, business, service." };
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
  const warnings: string[] = [];
  if (!parsed.content.trim()) warnings.push("Body markdown is empty.");

  if (intent === "validate") {
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
    }
    return { ok: true, slug, type, warnings };
  }

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

  if (type === "area") {
    const areaTypeRaw = String((fm as Record<string, unknown>).area_type ?? "").trim();
    const allowedAreaTypes = new Set([
      "shopping_area",
      "district",
      "square",
      "development",
      "neighborhood",
      "point_of_interest",
    ]);
    const areaType = allowedAreaTypes.has(areaTypeRaw) ? areaTypeRaw : "neighborhood";
    const includeInSiteBrowse = (fm.include_in_site_browse ?? true) !== false;

    const basePayload = {
      name: title,
      slug,
      town_id: townId,
      area_type: areaType,
      description_short: (fm.seo_description ?? "").trim() || null,
      latitude_center: lat ?? null,
      longitude_center: lng ?? null,
    } as const;
    const withBrowseFlag = {
      ...basePayload,
      include_in_site_browse: includeInSiteBrowse,
    };

    const first = await supabase.from("areas").upsert(withBrowseFlag, { onConflict: "slug" });
    if (first.error) {
      if (first.error.message.includes("include_in_site_browse")) {
        const retry = await supabase.from("areas").upsert(basePayload, { onConflict: "slug" });
        if (retry.error) return { error: `Area upsert failed: ${retry.error.message}` };
      } else {
        return { error: `Area upsert failed: ${first.error.message}` };
      }
    }
  }

  if (type === "business" || type === "service") {
    let categoryId: number | null = null;

    // Services default to the services category.
    if (type === "service") {
      const { data: serviceCat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", "services")
        .maybeSingle();
      categoryId = (serviceCat?.id as number | undefined) ?? null;
    } else {
      const categorySlug = String(fm.category_slug ?? fm.category ?? "").trim();
      if (categorySlug) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        categoryId = (cat?.id as number | undefined) ?? null;
      }
    }

    const { error: bizErr } = await supabase.from("businesses").upsert(
      {
        name: title,
        slug,
        status: "active",
        town_id: townId,
        category_id: categoryId,
        address: (fm.address ?? "").trim() || null,
        phone: (fm.phone ?? "").trim() || null,
        website: (fm.website ?? "").trim() || null,
        price_level: fm.price_range ? String(fm.price_range).length : null,
        lat,
        lng,
        ai_summary: (fm.seo_description ?? "").trim() || parsed.content.slice(0, 200) || null,
        has_physical_location: type === "service" ? false : true,
      },
      { onConflict: "slug" },
    );
    if (bizErr) return { error: `Business upsert failed: ${bizErr.message}` };
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
  revalidatePath(`/areas/${slug}`);
  return { ok: true, slug, type };
}

export async function updateContentFromMarkdownAction(
  entryId: string,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; slug?: string; type?: string; warnings?: string[] }> {
  const result = await ingestMarkdownContentAction(formData);
  if (result.ok) {
    revalidatePath(`/admin/content/${entryId}`);
  }
  return result;
}

