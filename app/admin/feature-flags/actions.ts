"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function toggleFeatureFlagAction(flagId: number, enabled: boolean): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();

  await supabase
    .from("feature_flags")
    .update({ enabled })
    .eq("id", flagId);

  revalidatePath("/admin/feature-flags");
  revalidatePath("/"); // Revalidate home page since flags are used there
}

export async function addFeatureFlagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (!name) return;

  await supabase.from("feature_flags").insert({
    name,
    description,
    enabled,
  });

  revalidatePath("/admin/feature-flags");
  revalidatePath("/");
}
