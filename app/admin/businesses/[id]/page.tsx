import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  regenerateAiSummaryFormAction,
  refreshFromDirectoryFormAction,
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
    { data: sources },
    { data: images },
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
      .from("business_sources")
      .select(
        "source_name, source_record_id, source_url, attribution_required, last_verified_at, confidence_score",
      )
      .eq("business_id", id)
      .order("source_name"),
    supabase
      .from("business_images")
      .select("*")
      .eq("business_id", id)
      .order("created_at", { ascending: false }),
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
      <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
        <p className="font-medium text-zinc-800">Data sources</p>
        {(sources ?? []).length ? (
          <ul className="mt-2 list-inside list-disc space-y-1">
            {(sources ?? []).map((s) => (
              <li key={`${s.source_name}-${s.source_record_id}`}>
                <code>{s.source_name as string}</code> ·{" "}
                <code className="break-all">{s.source_record_id as string}</code>
                {s.attribution_required ? (
                  <span className="text-amber-800"> · attribution required</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-zinc-500">No rows in business_sources.</p>
        )}
        {business.listing_external_key ? (
          <p className="mt-2 text-zinc-500">
            External key <code className="break-all">{business.listing_external_key as string}</code>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <form action={refreshFromDirectoryFormAction} className="inline">
          <input type="hidden" name="business_id" value={id} />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
          >
            Queue directory refresh
          </button>
        </form>
        <span className="text-xs text-zinc-500">
          Geoapify-backed listings only; runs on the daily refresh cron.
          {business.directory_refresh_requested_at ? (
            <span className="ml-2 font-medium text-amber-800">
              Queued since{" "}
              {new Date(business.directory_refresh_requested_at as string).toLocaleString()}
            </span>
          ) : null}
        </span>
        <form action={regenerateAiSummaryFormAction} className="inline">
          <input type="hidden" name="business_id" value={id} />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
          >
            Regenerate AI summary
          </button>
        </form>
      </div>
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
