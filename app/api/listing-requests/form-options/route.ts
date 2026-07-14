import { NextResponse } from "next/server";
import { getAllFeatureFlags, isFreeOnboardEnabled } from "@/lib/feature-flags";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

/** Categories + search tag vocabulary for the free intake form. */
export async function GET() {
  const flags = await getAllFeatureFlags();
  if (!isFreeOnboardEnabled(flags)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const [{ data: categories, error: catErr }, { data: tags, error: tagErr }] = await Promise.all([
    supabase
      .from("business_categories")
      .select("id, title, slug")
      .is("archived_at", null)
      .order("title", { ascending: true }),
    supabase.from("search_tags_vocabulary").select("tag").order("tag", { ascending: true }),
  ]);

  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 });
  }
  if (tagErr) {
    return NextResponse.json({ error: tagErr.message }, { status: 500 });
  }

  return NextResponse.json({
    categories: (categories ?? []).map((c) => ({
      id: String(c.id),
      title: String(c.title ?? ""),
      slug: String(c.slug ?? ""),
    })),
    searchTags: (tags ?? [])
      .map((t) => String((t as { tag: string }).tag ?? "").trim())
      .filter(Boolean),
  });
}
