import { NextResponse } from "next/server";
import { getAllFeatureFlags, isFreeOnboardEnabled } from "@/lib/feature-flags";
import { STOREFRONT_SERVICES_CATEGORY_SLUG } from "@/lib/routes/storefront-category-labels";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
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

  const [
    { data: categories, error: catErr },
    { data: serviceCategories, error: svcErr },
    { data: tags, error: tagErr },
  ] = await Promise.all([
    supabase
      .from("business_categories")
      .select("id, title, slug")
      .is("archived_at", null)
      .order("title", { ascending: true }),
    supabase
      .from("service_categories")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("title", { ascending: true }),
    supabase.from("search_tags_vocabulary").select("tag").order("tag", { ascending: true }),
  ]);

  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 });
  }
  if (svcErr) {
    return NextResponse.json({ error: svcErr.message }, { status: 500 });
  }
  if (tagErr) {
    return NextResponse.json({ error: tagErr.message }, { status: 500 });
  }

  // Omit legacy catch-all `services` — it is search-only and confuses submitters with /services.
  const storefrontCategories = (categories ?? []).filter(
    (c) => String(c.slug ?? "").toLowerCase() !== STOREFRONT_SERVICES_CATEGORY_SLUG,
  );

  return NextResponse.json({
    categories: storefrontCategories.map((c) => ({
      id: String(c.id),
      title: String(c.title ?? ""),
      slug: String(c.slug ?? ""),
    })),
    serviceCategories: (serviceCategories ?? []).map((c) => ({
      id: String(c.id),
      title: String(c.title ?? ""),
      slug: String(c.slug ?? ""),
    })),
    searchTags: (tags ?? [])
      .map((t) => String((t as { tag: string }).tag ?? "").trim())
      .filter(Boolean),
  });
}
