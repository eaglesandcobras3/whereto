"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

function asNumberOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export async function updateTownAction(townId: number, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!name || !slug) throw new Error("Name and slug are required.");

  const aiTagline = String(formData.get("ai_tagline") ?? "").trim() || null;
  const aiDescription = String(formData.get("ai_description") ?? "").trim() || null;
  const centerLat = asNumberOrNull(formData.get("center_lat"));
  const centerLng = asNumberOrNull(formData.get("center_lng"));
  const searchRadiusMeters = asNumberOrNull(formData.get("search_radius_meters"));

  const { error } = await supabase
    .from("towns")
    .update({
      name,
      slug,
      ai_tagline: aiTagline,
      ai_description: aiDescription,
      center_lat: centerLat,
      center_lng: centerLng,
      search_radius_meters: searchRadiusMeters,
    })
    .eq("id", townId);

  if (error) throw new Error(error.message);

  // Keep town content list in sync for /admin/content?type=town
  await supabase.from("content_entries").upsert(
    {
      content_type: "town",
      slug,
      title: name,
      excerpt: aiTagline,
      status: "published",
      published_at: new Date().toISOString(),
    },
    { onConflict: "content_type,slug" },
  );

  revalidatePath("/admin/towns");
  revalidatePath(`/admin/towns/${townId}`);
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content?type=town`);
  revalidatePath(`/${slug}`);
  return;
}
