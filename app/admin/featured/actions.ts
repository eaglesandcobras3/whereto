"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function addFeaturedBusinessAction(formData: FormData) {
  await requireAdmin();
  const businessId = formData.get("business_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const badge = formData.get("badge") as string;

  if (!businessId || !title) {
    return { error: "Business and title are required" };
  }

  const supabase = getServiceSupabase();

  // Get max sort order
  const { data: maxRow } = await supabase
    .from("featured_content")
    .select("sort_order")
    .eq("content_type", "business")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("featured_content").insert({
    content_type: "business",
    reference_id: businessId,
    title,
    description: description || null,
    badge: badge || null,
    sort_order: nextOrder,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { success: true };
}

export async function addFeaturedCategoryAction(formData: FormData) {
  await requireAdmin();
  const categoryId = formData.get("category_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!categoryId || !title) {
    return { error: "Category and title are required" };
  }

  const supabase = getServiceSupabase();

  const { data: maxRow } = await supabase
    .from("featured_content")
    .select("sort_order")
    .eq("content_type", "category")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("featured_content").insert({
    content_type: "category",
    reference_id: categoryId,
    title,
    description: description || null,
    sort_order: nextOrder,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { success: true };
}

export async function addFeaturedTownAction(formData: FormData) {
  await requireAdmin();
  const townId = formData.get("town_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!townId || !title) {
    return { error: "Town and title are required" };
  }

  const supabase = getServiceSupabase();

  const { data: maxRow } = await supabase
    .from("featured_content")
    .select("sort_order")
    .eq("content_type", "town")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("featured_content").insert({
    content_type: "town",
    reference_id: townId,
    title,
    description: description || null,
    sort_order: nextOrder,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { success: true };
}

export async function toggleFeaturedAction(id: number, isActive: boolean) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("featured_content")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { success: true };
}

export async function deleteFeaturedAction(id: number) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("featured_content")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { success: true };
}

export async function reorderFeaturedAction(
  id: number,
  direction: "up" | "down"
) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  // Get current item
  const { data: current } = await supabase
    .from("featured_content")
    .select("id, content_type, sort_order")
    .eq("id", id)
    .single();

  if (!current) {
    return { error: "Item not found" };
  }

  // Get neighbor
  const { data: neighbor } = await supabase
    .from("featured_content")
    .select("id, sort_order")
    .eq("content_type", current.content_type)
    .order("sort_order", { ascending: direction === "up" })
    [direction === "up" ? "lt" : "gt"]("sort_order", current.sort_order)
    .limit(1)
    .maybeSingle();

  if (!neighbor) {
    return { error: "Cannot move further" };
  }

  // Swap sort orders
  await Promise.all([
    supabase
      .from("featured_content")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id),
    supabase
      .from("featured_content")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id),
  ]);

  revalidatePath("/admin/featured");
  revalidatePath("/");
  return { success: true };
}
