import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadUnifiedCategoryOptions } from "@/lib/categories/load-unified-categories";
import { labelForSearchTag } from "@/lib/discovery-filters/search-tag-label";
import { requireAdminUser } from "@/lib/security/requireAdmin";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

const PAGE = 1000;

async function fetchAllRows<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  orderBy?: { column: string; ascending?: boolean },
): Promise<{ data: T[]; error: string | null }> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (orderBy) {
      q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }
    const { data, error } = await q;
    if (error) return { data: [], error: error.message };
    const batch = (data ?? []) as unknown as T[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return { data: out, error: null };
}

/** Unified categories + search tag vocabulary for the free intake form. */
export async function GET() {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const [admin, tagsResult, linksResult, categoryGroups] = await Promise.all([
    requireAdminUser(),
    fetchAllRows<{ tag: string; description: string | null }>(
      supabase,
      "search_tags_vocabulary",
      "tag, description",
      { column: "tag" },
    ),
    fetchAllRows<{ tag: string; category_id: string }>(
      supabase,
      "search_tag_categories",
      "tag, category_id",
    ),
    loadUnifiedCategoryOptions(),
  ]);

  if (tagsResult.error) {
    return NextResponse.json({ error: tagsResult.error }, { status: 500 });
  }
  if (linksResult.error) {
    return NextResponse.json({ error: linksResult.error }, { status: 500 });
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

  const searchTagOptions = tagsResult.data
    .map((t) => {
      const slug = String(t.tag ?? "").trim();
      if (!slug) return null;
      return { slug, label: labelForSearchTag(slug, t.description) };
    })
    .filter((t): t is { slug: string; label: string } => Boolean(t));

  const tagsByCategoryId: Record<string, string[]> = {};
  for (const link of linksResult.data) {
    const categoryId = String(link.category_id ?? "").trim();
    const tag = String(link.tag ?? "").trim();
    if (!categoryId || !tag) continue;
    const list = tagsByCategoryId[categoryId] ?? (tagsByCategoryId[categoryId] = []);
    list.push(tag);
  }
  for (const id of Object.keys(tagsByCategoryId)) {
    tagsByCategoryId[id].sort((a, b) => a.localeCompare(b));
  }

  return NextResponse.json({
    /** @deprecated Prefer categoryGroups; flat leaves for simple selects. */
    categories: leaves,
    categoryGroups,
    /** @deprecated Unified taxonomy — empty for backward-compatible clients. */
    serviceCategories: [],
    /** @deprecated Prefer searchTagOptions (slug + label). */
    searchTags: searchTagOptions.map((t) => t.slug),
    searchTagOptions,
    /** Leaf category UUID → suggested search tag slugs. */
    tagsByCategoryId,
    isAdmin: Boolean(admin),
    adminName: admin?.name ?? null,
    adminEmail: admin?.email ?? null,
  });
}
