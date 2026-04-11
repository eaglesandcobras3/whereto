import { redirect } from "next/navigation";
import { runSearch } from "@/lib/search/run-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { SearchPageClient } from "./search-page-client";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ q?: string; town_id?: string; price?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) return { title: "Search — WhereTo30A" };
  return {
    title: `Search results for "${q}" — WhereTo30A`,
    description: `Discover the best of the Emerald Coast for "${q}". Curated local recommendations and hidden gems.`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, town_id, price } = await searchParams;

  if (!q) {
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
    rawQuery: townName ? `${q} in ${townName}` : q,
    userId: user?.id ?? null,
    model,
    openaiKey: process.env.OPENAI_API_KEY,
    priceLevel: price ? parseInt(price) : undefined,
  });

  return (
    <SearchPageClient 
      initialQuery={q} 
      results={searchResult} 
      townName={townName}
    />
  );
}
