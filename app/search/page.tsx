import { redirect } from "next/navigation";
import { runSearch } from "@/lib/search/run-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { SearchPageClient } from "./search-page-client";
import { SiteFooter } from "@/components/home/SiteFooter";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ q?: string; town_id?: string; price?: string; page?: string; type?: string }>;
};

// Type filter labels and default queries
const TYPE_FILTERS: Record<string, { label: string; query: string }> = {
  stores: { label: "Stores", query: "shopping stores retail" },
  services: { label: "Services", query: "services spa salon wellness" },
  events: { label: "Events", query: "events activities things to do" },
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, type } = await searchParams;
  if (type && TYPE_FILTERS[type]) {
    return {
      title: `${TYPE_FILTERS[type].label} — WhereTo30A`,
      description: `Discover the best ${TYPE_FILTERS[type].label.toLowerCase()} on Florida's Emerald Coast.`,
    };
  }
  if (!q) return { title: "Search — WhereTo30A" };
  return {
    title: `Search results for "${q}" — WhereTo30A`,
    description: `Discover the best of the Emerald Coast for "${q}". Curated local recommendations and hidden gems.`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, town_id, price, type } = await searchParams;

  // Allow browsing by type without a query
  const effectiveQuery = q || (type && TYPE_FILTERS[type]?.query) || "";

  if (!effectiveQuery) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const serviceSupabase = getServiceSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  // Fetch town name if town_id is provided
  let townName = "";
  if (town_id) {
    const { data: town } = await serviceSupabase
      .from("towns")
      .select("name")
      .eq("id", Number(town_id))
      .single();
    if (town) townName = town.name;
  }

  // Optimize search for town if provided
  const searchResult = await runSearch({
    rawQuery: townName ? `${effectiveQuery} in ${townName}` : effectiveQuery,
    userId: user?.id ?? null,
    model,
    openaiKey: process.env.OPENAI_API_KEY,
    priceLevel: price ? parseInt(price) : undefined,
  });

  // Fetch sidebar data in parallel
  const [townsResult, recentPostsResult] = await Promise.all([
    serviceSupabase
      .from("towns")
      .select("name, slug")
      .order("name")
      .limit(10),
    serviceSupabase
      .from("businesses")
      .select("id, name, slug, hero_image_url")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Determine display query (user's query or type filter label)
  const displayQuery = q || (type && TYPE_FILTERS[type]?.label) || effectiveQuery;

  return (
    <SearchPageClient
      initialQuery={displayQuery}
      results={searchResult}
      townName={townName}
      footer={<SiteFooter />}
      towns={townsResult.data ?? []}
      recentPosts={recentPostsResult.data ?? []}
      activeType={type}
    />
  );
}
