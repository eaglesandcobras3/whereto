"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

type FeaturedInput = {
  featuredBusinesses?: {
    businessName: string;
    reason: string;
    badge: string;
  }[];
  featuredCategories?: {
    categoryName: string;
    headline: string;
    description: string;
  }[];
  townSpotlights?: {
    townName: string;
    tagline: string;
    featuredFor: string;
  }[];
  curatedCollections?: {
    title: string;
    description: string;
    businessNames: string[];
  }[];
};

export async function saveFeaturedAction(
  jsonString: string
): Promise<{ saved: number; failed: number; errors: string[] }> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const errors: string[] = [];
  let saved = 0;
  let failed = 0;

  let parsed: FeaturedInput;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { saved: 0, failed: 0, errors: ["Invalid JSON"] };
  }

  // Clear existing featured content
  await supabase.from("featured_content").delete().neq("id", 0);

  // Save featured businesses
  if (parsed.featuredBusinesses) {
    for (const fb of parsed.featuredBusinesses) {
      // Look up business by name
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .ilike("name", fb.businessName)
        .eq("status", "active")
        .maybeSingle();

      if (biz) {
        const { error } = await supabase.from("featured_content").insert({
          content_type: "business",
          reference_id: biz.id,
          title: fb.businessName,
          description: fb.reason,
          badge: fb.badge,
          sort_order: saved,
        });
        if (error) {
          errors.push(`Business ${fb.businessName}: ${error.message}`);
          failed++;
        } else {
          saved++;
        }
      } else {
        errors.push(`Business not found: ${fb.businessName}`);
        failed++;
      }
    }
  }

  // Save featured categories
  if (parsed.featuredCategories) {
    for (const fc of parsed.featuredCategories) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", fc.categoryName)
        .maybeSingle();

      if (cat) {
        const { error } = await supabase.from("featured_content").insert({
          content_type: "category",
          reference_id: cat.id.toString(),
          title: fc.headline,
          description: fc.description,
          sort_order: saved,
        });
        if (error) {
          errors.push(`Category ${fc.categoryName}: ${error.message}`);
          failed++;
        } else {
          saved++;
        }
      } else {
        errors.push(`Category not found: ${fc.categoryName}`);
        failed++;
      }
    }
  }

  // Save town spotlights
  if (parsed.townSpotlights) {
    for (const ts of parsed.townSpotlights) {
      const { data: town } = await supabase
        .from("towns")
        .select("id")
        .ilike("name", ts.townName)
        .maybeSingle();

      if (town) {
        const { error } = await supabase.from("featured_content").insert({
          content_type: "town",
          reference_id: town.id.toString(),
          title: ts.tagline,
          description: ts.featuredFor,
          sort_order: saved,
        });
        if (error) {
          errors.push(`Town ${ts.townName}: ${error.message}`);
          failed++;
        } else {
          saved++;
        }
      } else {
        errors.push(`Town not found: ${ts.townName}`);
        failed++;
      }
    }
  }

  // Save curated collections
  if (parsed.curatedCollections) {
    for (const cc of parsed.curatedCollections) {
      // Look up business IDs
      const businessIds: string[] = [];
      for (const name of cc.businessNames) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id")
          .ilike("name", name)
          .eq("status", "active")
          .maybeSingle();
        if (biz) businessIds.push(biz.id);
      }

      const { error } = await supabase.from("featured_content").insert({
        content_type: "collection",
        title: cc.title,
        description: cc.description,
        metadata: { businessIds },
        sort_order: saved,
      });
      if (error) {
        errors.push(`Collection ${cc.title}: ${error.message}`);
        failed++;
      } else {
        saved++;
      }
    }
  }

  revalidatePath("/admin/data-pipeline/featured");
  revalidatePath("/admin/data-pipeline");
  revalidatePath("/");

  return { saved, failed, errors };
}
