"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function addCategoryAction(formData: FormData) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const googleTypes = String(formData.get("google_types") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name || !slug) {
    return { error: "Name and slug are required" };
  }

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    google_types: googleTypes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function addToQueueAction(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = getServiceSupabase();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (!name || !slug) {
    return { error: "Name and slug are required" };
  }

  const { error } = await supabase.from("category_build_queue").insert({
    suggested_slug: slug,
    status: "queued",
    payload_json: {
      normalized_category: name,
      note: "Manually added to queue",
    },
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function completeQueueItemAction(queueId: number) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("category_build_queue")
    .update({ status: "completed" })
    .eq("id", queueId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteQueueItemAction(queueId: number) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("category_build_queue")
    .delete()
    .eq("id", queueId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { ok: true };
}
