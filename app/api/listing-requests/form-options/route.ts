import { NextResponse } from "next/server";
import { loadUnifiedCategoryOptions } from "@/lib/categories/load-unified-categories";
import { getAllFeatureFlags, isFreeOnboardEnabled } from "@/lib/feature-flags";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

/** Unified categories + search tag vocabulary for the free intake form. */
export async function GET() {
  const flags = await getAllFeatureFlags();
  if (!isFreeOnboardEnabled(flags)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const [{ data: tags, error: tagErr }, categoryGroups] = await Promise.all([
    supabase.from("search_tags_vocabulary").select("tag").order("tag", { ascending: true }),
    loadUnifiedCategoryOptions(),
  ]);

  if (tagErr) {
    return NextResponse.json({ error: tagErr.message }, { status: 500 });
  }

  const leaves = categoryGroups.flatMap((g) =>
    g.leaves.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      rollupTitle: g.title,
      rollupSlug: g.slug,
    })),
  );

  return NextResponse.json({
    /** @deprecated Prefer categoryGroups; flat leaves for simple selects. */
    categories: leaves,
    categoryGroups,
    /** @deprecated Unified taxonomy — empty for backward-compatible clients. */
    serviceCategories: [],
    searchTags: (tags ?? [])
      .map((t) => String((t as { tag: string }).tag ?? "").trim())
      .filter(Boolean),
  });
}
