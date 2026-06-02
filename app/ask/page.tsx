import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AskSession } from "@/components/ask/AskSession";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { getAllFeatureFlags, isAskEnabled } from "@/lib/feature-flags";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const metadata: Metadata = {
  title: "Ask WhereTo30A",
  description:
    "AI concierge for 30A — discover verified restaurants, coffee, activities, and local guides.",
  robots: { index: false, follow: true },
};

async function loadTowns(): Promise<ListBusinessTownOption[]> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];
  const { data } = await supabase
    .from("towns")
    .select("id, title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title");
  return (data ?? []).map((t) => ({
    id: t.id as string,
    title: (t as { title: string }).title,
    slug: t.slug as string,
  }));
}

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const flags = await getAllFeatureFlags();
  if (!isAskEnabled(flags)) {
    redirect("/");
  }

  const sp = await searchParams;
  const rawQ = sp.q;
  const initialQuery =
    typeof rawQ === "string" ? rawQ : Array.isArray(rawQ) ? rawQ[0] : undefined;

  const towns = await loadTowns();

  return <AskSession towns={towns} initialQuery={initialQuery} />;
}
