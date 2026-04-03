"use server";

import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  googlePlaceDetails,
  placeIdToResource,
} from "@/lib/ingestion/google-places";

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
    .select("name, google_rating, google_review_count, price_level")
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
          rating: b.google_rating,
          reviews: b.google_review_count,
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

export async function refreshFromGoogleFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("business_id") ?? "");
  if (!id) return;
  await refreshFromGoogleAction(id);
}

export async function regenerateAiSummaryFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get("business_id") ?? "");
  if (!id) return;
  await regenerateAiSummaryAction(id);
}

export async function refreshFromGoogleAction(businessId: string) {
  await requireAdmin();
  const gkey = process.env.GOOGLE_PLACES_API_KEY;
  if (!gkey) return { error: "GOOGLE_PLACES_API_KEY not set" };
  const supabase = getServiceSupabase();

  const { data: b, error } = await supabase
    .from("businesses")
    .select("google_place_id")
    .eq("id", businessId)
    .single();
  if (error || !b?.google_place_id) return { error: "Business or place id missing" };

  const details = await googlePlaceDetails(
    gkey,
    placeIdToResource(b.google_place_id as string),
  );
  const lat = details.location?.latitude;
  const lng = details.location?.longitude;

  const priceMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  await supabase
    .from("businesses")
    .update({
      name: details.displayName?.text ?? undefined,
      address: details.formattedAddress ?? null,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      phone: details.nationalPhoneNumber ?? null,
      website: details.websiteUri ?? null,
      google_rating: details.rating ?? null,
      google_review_count: details.userRatingCount ?? 0,
      price_level: details.priceLevel
        ? (priceMap[details.priceLevel] ?? null)
        : null,
      hours_json: details.regularOpeningHours
        ? JSON.parse(JSON.stringify(details.regularOpeningHours))
        : null,
      status:
        details.businessStatus === "CLOSED_PERMANENTLY" ? "closed" : "active",
      last_refreshed_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true as const };
}
