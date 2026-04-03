"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** Keep `keepId`, hide `mergeId` (soft merge). Copies tags missing on keeper. */
export async function mergeDuplicateAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const keepId = String(formData.get("keep_id") ?? "");
  const mergeId = String(formData.get("merge_id") ?? "");
  if (!keepId || !mergeId || keepId === mergeId) {
    return;
  }

  const supabase = getServiceSupabase();

  const { data: tagsToCopy } = await supabase
    .from("business_tags")
    .select("tag_id, source, confidence")
    .eq("business_id", mergeId);

  const { data: existing } = await supabase
    .from("business_tags")
    .select("tag_id")
    .eq("business_id", keepId);
  const have = new Set((existing ?? []).map((r) => r.tag_id as number));

  const inserts =
    tagsToCopy
      ?.filter((t) => !have.has(t.tag_id as number))
      .map((t) => ({
        business_id: keepId,
        tag_id: t.tag_id as number,
        source: (t.source as string) || "admin_set",
        confidence: Number(t.confidence) || 1,
      })) ?? [];

  if (inserts.length) {
    await supabase.from("business_tags").insert(inserts);
  }

  await supabase
    .from("businesses")
    .update({
      status: "hidden",
      admin_suppressed: true,
    })
    .eq("id", mergeId);

  revalidatePath("/admin/businesses");
  revalidatePath("/admin/duplicates");
}
