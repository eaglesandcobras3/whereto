"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { generateDiscoveryPlan, queueDiscoveryPlan } from "@/lib/ingestion/discovery-planner";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function planDiscoveryAction(formData: FormData) {
  const { user } = await requireAdmin();
  const categoryId = Number(formData.get("category_id"));
  const rawInput = String(formData.get("categories") ?? "").trim();

  if (!categoryId || !rawInput) {
    return { error: "Category ID and input list are required" };
  }

  const inputCategories = rawInput
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = getServiceSupabase();
  
  // Fetch all towns for the planner
  const { data: towns } = await supabase.from("towns").select("id, name");
  const { data: cat } = await supabase.from("categories").select("name").eq("id", categoryId).single();

  if (!towns || !cat) {
    return { error: "Failed to fetch required reference data" };
  }

  try {
    const tasks = await generateDiscoveryPlan({
      categories: inputCategories,
      towns: towns as { id: number; name: string }[],
    });

    const count = await queueDiscoveryPlan({
      parentCategory: cat.name,
      categoryId,
      tasks,
      createdBy: user.id,
    });

    revalidatePath("/admin/discovery");
    revalidatePath("/admin/jobs");
    return { ok: true, count };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Planning failed" };
  }
}
