"use server";

import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import matter from "gray-matter";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function updateBusinessAction(
  businessId: string,
  formData: FormData,
) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };
  const status = String(formData.get("status") ?? "active");
  const admin_suppressed = formData.get("admin_suppressed") === "on";
  const suspected_closed = formData.get("suspected_closed") === "on";
  const has_physical_location = formData.get("has_physical_location") === "on";
  const town_id = formData.get("town_id")
    ? Number(formData.get("town_id"))
    : null;
  const category_id = formData.get("category_id")
    ? Number(formData.get("category_id"))
    : null;
  const ai_summary = String(formData.get("ai_summary") ?? "").trim() || null;
  const hero_image_url = String(formData.get("hero_image_url") ?? "").trim() || null;

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      status,
      admin_suppressed,
      suspected_closed,
      has_physical_location,
      town_id: Number.isFinite(town_id as number) ? town_id : null,
      category_id: Number.isFinite(category_id as number) ? category_id : null,
      ai_summary,
      ai_summary_updated_at: ai_summary ? new Date().toISOString() : undefined,
      hero_image_url,
    })
    .eq("id", businessId);

  if (error) return { error: error.message };

  const tagIds = formData.getAll("tag_ids").map(String).filter(Boolean);
  await supabase.from("business_tags").delete().eq("business_id", businessId);
  if (tagIds.length) {
    await supabase.from("business_tags").insert(
      tagIds.map((tag_id) => ({
        business_id: businessId,
        tag_id: Number(tag_id),
        source: "admin_set",
        confidence: 1,
      })),
    );
  }

  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath("/admin/businesses");
  return { ok: true as const };
}

export async function regenerateAiSummaryAction(businessId: string) {
  await requireAdmin();
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: "OPENAI_API_KEY not set" };
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const supabase = getServiceSupabase();

  const { data: b, error } = await supabase
    .from("businesses")
    .select("name, listing_rating, listing_review_count, price_level")
    .eq("id", businessId)
    .single();
  if (error || !b) return { error: "Business not found" };

  const openai = new OpenAI({ apiKey: key });
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Generate a 2-sentence summary for travelers. JSON only: {"summary":"..."}',
      },
      {
        role: "user",
        content: JSON.stringify({
          name: b.name,
          rating: b.listing_rating,
          reviews: b.listing_review_count,
          price_level: b.price_level,
        }),
      },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) return { error: "Empty AI response" };
  const { summary } = JSON.parse(text) as { summary?: string };
  if (!summary) return { error: "Invalid AI JSON" };

  await supabase
    .from("businesses")
    .update({
      ai_summary: summary,
      ai_summary_updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true as const };
}

export async function refreshFromDirectoryFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("business_id") ?? "");
  if (!id) return;
  await refreshFromDirectoryAction(id);
}

export async function regenerateAiSummaryFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("business_id") ?? "");
  if (!id) return;
  await regenerateAiSummaryAction(id);
}

/**
 * Queues Geoapify Place Details refresh for the daily cron only (no live API from this action).
 */
export async function refreshFromDirectoryAction(businessId: string) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { data: src, error } = await supabase
    .from("business_sources")
    .select("id")
    .eq("business_id", businessId)
    .eq("source_name", "geoapify")
    .maybeSingle();

  if (error || !src) {
    return {
      error:
        "No Geoapify source on this listing — refresh applies to directory-ingested rows only.",
    };
  }

  const { error: upErr } = await supabase
    .from("businesses")
    .update({ directory_refresh_requested_at: new Date().toISOString() })
    .eq("id", businessId);

  if (upErr) return { error: upErr.message };

  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true as const, queued: true as const };
}

export async function addBusinessImageAction(
  businessId: string,
  formData: FormData,
) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const public_url = String(formData.get("public_url") ?? "").trim();
  const image_type = String(formData.get("image_type") ?? "owner");
  const attribution_text = String(formData.get("attribution_text") ?? "").trim();

  if (!public_url) return { error: "URL is required" };

  const { error } = await supabase.from("business_images").insert({
    business_id: businessId,
    public_url,
    image_type,
    attribution_text: attribution_text || null,
    approved_for_display: true,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true };
}

export async function deleteBusinessImageAction(
  businessId: string,
  imageId: string,
) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("business_images")
    .delete()
    .eq("id", imageId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true };
}

export async function deleteBusinessAction(businessId: string) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", businessId);

  if (error) return { error: error.message };

  revalidatePath("/admin/businesses");
  return { ok: true, deleted: true };
}

type BusinessFrontmatter = {
  title?: string;
  type?: string;
  slug?: string;
  status?: string;
  seo_description?: string;
  seo_title?: string;
  seo_keywords?: string[];
  town?: string;
  categories?: string[];
  tags?: string[];
  phone?: string;
  website?: string;
  address?: string;
  price_range?: string;
  latitude?: number;
  longitude?: number;
  map_center?: { lat?: number; lng?: number };
  map_location?: { lat?: number; lng?: number };
  has_physical_location?: boolean;
};

function parseNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function ingestBusinessMarkdownAction(formData: FormData): Promise<{
  ok?: boolean;
  error?: string;
  slug?: string;
}> {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const raw = String(formData.get("markdown") ?? "");
  if (!raw.trim()) return { error: "Markdown is required." };

  let parsed: { data: BusinessFrontmatter; content: string };
  try {
    const m = matter(raw);
    parsed = { data: (m.data as BusinessFrontmatter) ?? {}, content: m.content ?? "" };
  } catch (e) {
    return { error: `Frontmatter parse failed: ${e instanceof Error ? e.message : "unknown error"}` };
  }

  const fm = parsed.data;
  if ((fm.type ?? "").trim() !== "business") {
    return { error: 'Frontmatter must include `type: business`.' };
  }
  const slug = (fm.slug ?? "").trim();
  const title = (fm.title ?? "").trim();
  if (!slug || !title) {
    return { error: "Frontmatter must include `slug` and `title`." };
  }

  const townSlug = (fm.town ?? "").trim();
  let townId: number | null = null;
  if (townSlug) {
    const { data: town } = await supabase
      .from("towns")
      .select("id")
      .eq("slug", townSlug)
      .maybeSingle();
    townId = (town?.id as number | undefined) ?? null;
  }

  const categorySlug = (fm.categories?.[0] ?? "").trim();
  let categoryId: number | null = null;
  if (categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    categoryId = (category?.id as number | undefined) ?? null;
  }

  const lat = parseNumberOrNull(fm.latitude) ?? parseNumberOrNull(fm.map_center?.lat) ?? parseNumberOrNull(fm.map_location?.lat);
  const lng = parseNumberOrNull(fm.longitude) ?? parseNumberOrNull(fm.map_center?.lng) ?? parseNumberOrNull(fm.map_location?.lng);
  const summary = (fm.seo_description ?? "").trim() || parsed.content.slice(0, 240).trim() || null;
  const hasPhysicalLocation =
    typeof fm.has_physical_location === "boolean"
      ? fm.has_physical_location
      : Boolean((fm.address ?? "").trim() || (lat != null && lng != null));

  const { data: upserted, error: bizErr } = await supabase
    .from("businesses")
    .upsert(
      {
        name: title,
        slug,
        status: "active",
        town_id: townId,
        category_id: categoryId,
        address: (fm.address ?? "").trim() || null,
        phone: (fm.phone ?? "").trim() || null,
        website: (fm.website ?? "").trim() || null,
        price_level: fm.price_range ? String(fm.price_range).trim().length : null,
        lat,
        lng,
        ai_summary: summary,
        has_physical_location: hasPhysicalLocation,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (bizErr || !upserted?.id) {
    return { error: `Business upsert failed: ${bizErr?.message ?? "unknown error"}` };
  }

  const { error: pageErr } = await supabase.from("pages").upsert(
    {
      slug,
      page_type: "business",
      title,
      body_markdown: parsed.content,
      seo_title: (fm.seo_title ?? "").trim() || null,
      seo_description: (fm.seo_description ?? "").trim() || null,
      seo_keywords: fm.seo_keywords ?? null,
      status: "published",
    },
    { onConflict: "slug" },
  );
  if (pageErr) {
    return { error: `Business page markdown upsert failed: ${pageErr.message}` };
  }

  if (Array.isArray(fm.tags) && fm.tags.length > 0) {
    const tagSlugs = fm.tags.map((t) => String(t).trim()).filter(Boolean);
    const { data: tagRows } = await supabase
      .from("tags")
      .select("id, slug")
      .in("slug", tagSlugs);
    const tagIds = (tagRows ?? []).map((r) => r.id as number);
    await supabase.from("business_tags").delete().eq("business_id", upserted.id);
    if (tagIds.length > 0) {
      await supabase.from("business_tags").insert(
        tagIds.map((tagId) => ({
          business_id: upserted.id as string,
          tag_id: tagId,
          source: "admin_set",
          confidence: 1,
        })),
      );
    }
  }

  revalidatePath("/admin/businesses");
  revalidatePath(`/admin/businesses/${upserted.id}`);
  revalidatePath(`/business/${slug}`);
  return { ok: true, slug };
}
