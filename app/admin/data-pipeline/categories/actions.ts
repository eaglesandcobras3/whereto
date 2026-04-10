"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type CategoryInput = {
  name: string;
  slug: string;
  description?: string;
  googleTypes?: string[];
  icon?: string;
  priority?: number;
};

export async function saveCategoriesAction(
  jsonString: string
): Promise<{ saved: number; failed: number; errors: string[] }> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const errors: string[] = [];
  let saved = 0;
  let failed = 0;

  let parsed: CategoryInput[];
  try {
    parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { saved: 0, failed: 0, errors: ["JSON must be an array of categories"] };
    }
  } catch {
    return { saved: 0, failed: 0, errors: ["Invalid JSON"] };
  }

  for (const cat of parsed) {
    if (!cat.name || !cat.slug) {
      errors.push(`Missing name or slug: ${JSON.stringify(cat).slice(0, 50)}`);
      failed++;
      continue;
    }

    const { error } = await supabase
      .from("categories")
      .upsert({
        name: cat.name,
        slug: cat.slug,
        description: cat.description || null,
        google_types: cat.googleTypes || [],
        discovery_priority: cat.priority || 5,
      }, { onConflict: "slug" });

    if (error) {
      errors.push(`${cat.name}: ${error.message}`);
      failed++;
    } else {
      saved++;
    }
  }

  revalidatePath("/admin/data-pipeline/categories");
  revalidatePath("/admin/data-pipeline");

  return { saved, failed, errors };
}
