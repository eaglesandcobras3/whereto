"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function addFieldGroupAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const groupKey = String(formData.get("group_key") ?? "").trim();
  const groupLabel = String(formData.get("group_label") ?? "").trim();
  const appliesRaw = String(formData.get("applies_to_csv") ?? "").trim();
  const appliesTo = appliesRaw
    ? appliesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (!groupKey || !groupLabel) return;

  await supabase.from("field_groups").insert({
    group_key: groupKey,
    group_label: groupLabel,
    applies_to: appliesTo,
  });

  revalidatePath("/admin/content-model");
}

export async function addFieldDefinitionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const groupId = Number(formData.get("group_id") ?? 0);
  const fieldKey = String(formData.get("field_key") ?? "").trim();
  const fieldLabel = String(formData.get("field_label") ?? "").trim();
  const fieldType = String(formData.get("field_type") ?? "").trim();
  const required = formData.get("is_required") === "on";
  if (!groupId || !fieldKey || !fieldLabel || !fieldType) return;

  await supabase.from("field_definitions").insert({
    group_id: groupId,
    field_key: fieldKey,
    field_label: fieldLabel,
    field_type: fieldType,
    is_required: required,
  });

  revalidatePath("/admin/content-model");
}

