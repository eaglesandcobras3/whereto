"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function toggleFeatureFlagAction(flagId: number, enabled: boolean) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled })
    .eq("id", flagId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/feature-flags");
  revalidatePath("/"); // Revalidate home page since flags are used there
  return { ok: true };
}

export async function addFeatureFlagAction(formData: FormData) {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (!name) return { error: "Name is required" };

  const { error } = await supabase.from("feature_flags").insert({
    name,
    description,
    enabled,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/feature-flags");
  revalidatePath("/");
  return { ok: true };
}
