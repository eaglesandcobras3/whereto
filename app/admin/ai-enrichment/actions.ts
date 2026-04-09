"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { processEnrichmentBatch } from "@/lib/ai/enrich-business";

export async function runEnrichmentBatchAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const batchSize = Number(formData.get("batchSize")) || 50;

  await processEnrichmentBatch(batchSize);

  revalidatePath("/admin/ai-enrichment");
}
