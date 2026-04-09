import { Suspense } from "react";
import { HomePage } from "@/components/home/HomePage";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export default async function Home() {
  const flags = await getAllFeatureFlags();
  const supabase = getServiceSupabase();

  let featuredBusinesses: any[] = [];
  if (flags["featured_business"]) {
    const { data } = await supabase
      .from("businesses")
      .select("id, name, slug, hero_image_url, ai_summary, status")
      .eq("status", "active")
      .order("confidence_score", { ascending: false })
      .limit(10);
    featuredBusinesses = data ?? [];
  }

  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" aria-hidden />}
    >
      <HomePage featureFlags={flags} featuredBusinesses={featuredBusinesses} />
    </Suspense>
  );
}
