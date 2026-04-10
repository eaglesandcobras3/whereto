"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { saveManualEnrichmentResults } from "@/lib/ai/enrich-business";

export async function saveBusinessEnrichmentAction(jsonString: string) {
  await requireAdmin();
  const result = await saveManualEnrichmentResults(jsonString);
  revalidatePath("/admin/data-pipeline/business-enrichment");
  revalidatePath("/admin/data-pipeline");
  return result;
}
