import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  updateBusinessAction,
  updateBusinessFromMarkdownAction,
  addBusinessImageAction,
  deleteBusinessImageAction,
  deleteBusinessAction,
} from "@/app/admin/businesses/actions";
import { BusinessEditForm, BusinessImage } from "@/app/admin/businesses/edit-form";
import { BusinessMarkdownEditor } from "@/app/admin/businesses/business-markdown-editor";

export default async function AdminBusinessEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = getServiceSupabase();

  const [
    { data: business, error },
    { data: towns },
    { data: categories },
    { data: tags },
    { data: images },
    { data: featuredRow },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        `
        id, slug, name, address, status, admin_suppressed, suspected_closed,
        town_id, category_id, listing_external_key, phone, website,
        lat, lng, listing_rating, listing_review_count, price_level, ai_summary,
        confidence_score, freshness_score, engagement_score,
        directory_refresh_requested_at, hero_image_url, has_physical_location
      `,
      )
      .eq("id", id)
      .single(),
    supabase.from("towns").select("id, name, slug").order("name"),
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("tags").select("id, name, slug, category").order("display_order"),
    supabase
      .from("business_images")
      .select("*")
      .eq("business_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("featured_content")
      .select("id")
      .eq("content_type", "business")
      .eq("reference_id", id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (error || !business) notFound();

  const { data: pageRow } = await supabase
    .from("pages")
    .select("body_markdown, seo_title, seo_description, seo_keywords")
    .eq("slug", String((business as { slug?: string } | null)?.slug ?? ""))
    .eq("page_type", "business")
    .maybeSingle();

  const { data: bt } = await supabase
    .from("business_tags")
    .select("tag_id")
    .eq("business_id", id);

  const selectedTagIds = new Set((bt ?? []).map((r) => String(r.tag_id)));
  const businessImages = (images ?? []) as BusinessImage[];
  const townSlug = (() => {
    const townRow = (towns ?? []).find((t) => String(t.id) === String(business.town_id ?? ""));
    return townRow?.slug ?? "";
  })();
  const categorySlug = (() => {
    const categoryRow = (categories ?? []).find(
      (c) => String(c.id) === String(business.category_id ?? ""),
    );
    return categoryRow?.slug ?? "";
  })();
  const tagSlugs = (tags ?? [])
    .filter((t) => selectedTagIds.has(String(t.id)))
    .map((t) => (t.slug ? String(t.slug) : String(t.name).toLowerCase().replace(/\s+/g, "-")));
  const bodyMarkdown = (pageRow?.body_markdown as string | null) ?? "";
  const seoTitle = (pageRow?.seo_title as string | null) ?? "";
  const seoDescription = (pageRow?.seo_description as string | null) ?? "";
  const seoKeywords = (pageRow?.seo_keywords as string[] | null) ?? [];
  const markdownTemplate = `---
title: "${String(business.name ?? "").replace(/"/g, '\\"')}"
type: business
entity_type: ${String(categorySlug || "business")}
slug: ${String(business.slug ?? "")}
status: published
town: ${townSlug || ""}
category: ${categorySlug || ""}
categories:
  - ${categorySlug || "services"}
tags:
${tagSlugs.length > 0 ? tagSlugs.map((s) => `  - ${s}`).join("\n") : "  - business"}
seo_title: "${seoTitle.replace(/"/g, '\\"')}"
seo_description: "${seoDescription.replace(/"/g, '\\"')}"
seo_keywords:
${seoKeywords.length > 0 ? seoKeywords.map((k) => `  - ${String(k).replace(/"/g, '\\"')}`).join("\n") : "  - local business"}
address: "${String(business.address ?? "").replace(/"/g, '\\"')}"
phone: "${String(business.phone ?? "").replace(/"/g, '\\"')}"
website: "${String(business.website ?? "").replace(/"/g, '\\"')}"
price_range: "${"$".repeat(Math.max(1, Number(business.price_level ?? 2)))}"
has_physical_location: ${Boolean(business.has_physical_location ?? true)}
map_location:
  lat: ${business.lat != null ? String(business.lat) : ""}
  lng: ${business.lng != null ? String(business.lng) : ""}
---

${bodyMarkdown}`.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/businesses" className="text-sm text-teal-700 hover:underline">
          ← Businesses
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Edit: {business.name as string}
      </h1>
      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-zinc-500">Confidence</p>
          <p className="font-medium">{String(business.confidence_score)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Freshness</p>
          <p className="font-medium">{String(business.freshness_score)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Engagement</p>
          <p className="font-medium">{String(business.engagement_score)}</p>
        </div>
      </div>
      <BusinessEditForm
        businessId={id}
        business={business as Record<string, unknown>}
        towns={towns ?? []}
        categories={categories ?? []}
        tags={tags ?? []}
        selectedTagIds={selectedTagIds}
        businessImages={businessImages}
        featuredOnHome={Boolean(featuredRow?.id)}
        updateAction={updateBusinessAction.bind(null, id)}
        addImageAction={addBusinessImageAction.bind(null, id)}
        deleteImageAction={deleteBusinessImageAction.bind(null, id)}
        deleteAction={deleteBusinessAction.bind(null, id)}
      />
      <BusinessMarkdownEditor
        initialMarkdown={markdownTemplate}
        action={updateBusinessFromMarkdownAction.bind(null, id)}
      />
    </div>
  );
}
