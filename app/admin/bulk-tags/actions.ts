"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function applyBulkTagsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const tagId = Number(formData.get("tag_id"));
  const rawIds = String(formData.get("business_ids") ?? "");
  if (!Number.isFinite(tagId)) return;

  const ids = rawIds
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!ids.length) return;

  const supabase = getServiceSupabase();
  const { data: tag } = await supabase.from("tags").select("id").eq("id", tagId).maybeSingle();
  if (!tag) return;

  for (const business_id of ids) {
    await supabase.from("business_tags").upsert(
      {
        business_id,
        tag_id: tagId,
        source: "admin",
        confidence: 1,
      },
      { onConflict: "business_id,tag_id" },
    );
  }

  revalidatePath("/admin/bulk-tags");
  revalidatePath("/admin/businesses");
}
