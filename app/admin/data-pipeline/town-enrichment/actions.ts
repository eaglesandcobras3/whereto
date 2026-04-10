"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { saveTownEnrichmentResults } from "@/lib/ai/enrich-town";

export async function saveTownEnrichmentAction(jsonString: string) {
  await requireAdmin();
  const result = await saveTownEnrichmentResults(jsonString);
  revalidatePath("/admin/data-pipeline/town-enrichment");
  revalidatePath("/admin/data-pipeline");
  return result;
}
