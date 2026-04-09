"use server";

import { revalidatePath } from "next/cache";
import OpenAI from "openai";
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
