import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { BusinessPayload } from "@/lib/search/types";

export default async function Home() {
  const flags = await getAllFeatureFlags();
  const supabase = getServiceSupabase();

  let featuredBusinesses: (BusinessPayload & { 
    featured_title?: string | null; 
    featured_description?: string | null; 
    badge?: string | null;
  })[] = [];
  if (flags["featured_business"]) {
    // First try to get from featured_content table
    const { data: featured } = await supabase
      .from("featured_content")
      .select("reference_id, title, description, badge")
      .eq("content_type", "business")
      .eq("is_active", true)
      .order("sort_order")
      .limit(10);

    if (featured && featured.length > 0) {
      // Get the actual business data for featured items
      const businessIds = featured.map((f) => f.reference_id).filter(Boolean);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, slug, hero_image_url, ai_summary")
        .in("id", businessIds);

      const bizMap = new Map((businesses ?? []).map((b) => [b.id, b]));
      featuredBusinesses = featured
        .map((f) => {
          const biz = bizMap.get(f.reference_id);
          if (!biz) return null;
          return {
            ...biz,
            featured_title: f.title,
            featured_description: f.description,
            badge: f.badge,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
    }

    // Fallback: if no featured content, get top businesses by score
    if (featuredBusinesses.length === 0) {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, hero_image_url, ai_summary, status")
        .eq("status", "active")
        .order("confidence_score", { ascending: false })
        .limit(10);
      featuredBusinesses = data ?? [];
    }
  }

  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" aria-hidden />}
    >
      <HomePage featureFlags={flags} featuredBusinesses={featuredBusinesses} />
    </Suspense>
  );
}
