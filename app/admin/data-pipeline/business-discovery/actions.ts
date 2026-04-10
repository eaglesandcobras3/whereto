"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type BusinessInput = {
  name: string;
  address?: string;
  town_id?: number;
  category_id?: number;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  google_place_id?: string;
  description?: string;
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export async function saveBusinessesAction(
  jsonString: string
): Promise<{ saved: number; failed: number; errors: string[] }> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const errors: string[] = [];
  let saved = 0;
  let failed = 0;

  let parsed: BusinessInput[];
  try {
    parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { saved: 0, failed: 0, errors: ["JSON must be an array of businesses"] };
    }
  } catch {
    return { saved: 0, failed: 0, errors: ["Invalid JSON"] };
  }

  for (const biz of parsed) {
    if (!biz.name) {
      errors.push(`Missing name: ${JSON.stringify(biz).slice(0, 50)}`);
      failed++;
      continue;
    }

    if (!biz.lat || !biz.lng) {
      errors.push(`${biz.name}: Missing lat/lng coordinates`);
      failed++;
      continue;
    }

    const slug = generateSlug(biz.name);
    const googlePlaceId = biz.google_place_id || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { error } = await supabase
      .from("businesses")
      .upsert({
        name: biz.name,
        slug,
        address: biz.address || null,
        town_id: biz.town_id || null,
        category_id: biz.category_id || null,
        lat: biz.lat,
        lng: biz.lng,
        phone: biz.phone || null,
        website: biz.website || null,
        google_place_id: googlePlaceId,
        ai_summary: biz.description || null,
        status: "active",
      }, { onConflict: "google_place_id" });

    if (error) {
      errors.push(`${biz.name}: ${error.message}`);
      failed++;
    } else {
      saved++;
    }
  }

  revalidatePath("/admin/data-pipeline/business-discovery");
  revalidatePath("/admin/data-pipeline");

  return { saved, failed, errors };
}
