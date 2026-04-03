import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  regenerateAiSummaryFormAction,
  refreshFromGoogleFormAction,
  updateBusinessAction,
} from "@/app/admin/businesses/actions";
import { BusinessEditForm } from "@/app/admin/businesses/edit-form";

export default async function AdminBusinessEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = getServiceSupabase();

  const [{ data: business, error }, { data: towns }, { data: categories }, { data: tags }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select(
          `
        id, name, address, status, admin_suppressed, suspected_closed,
        town_id, category_id, google_place_id, phone, website,
        google_rating, google_review_count, price_level, ai_summary,
        confidence_score, freshness_score, engagement_score
      `,
        )
        .eq("id", id)
        .single(),
      supabase.from("towns").select("id, name, slug").order("name"),
      supabase.from("categories").select("id, name, slug").order("name"),
      supabase.from("tags").select("id, name, slug, category").order("display_order"),
    ]);

  if (error || !business) notFound();

  const { data: bt } = await supabase
    .from("business_tags")
    .select("tag_id")
    .eq("business_id", id);

  const selectedTagIds = new Set((bt ?? []).map((r) => String(r.tag_id)));

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
      <p className="text-xs text-zinc-500">
        Place ID: <code>{business.google_place_id as string}</code>
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        <form action={refreshFromGoogleFormAction} className="inline">
          <input type="hidden" name="business_id" value={id} />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
          >
            Refresh from Google
          </button>
        </form>
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
        updateAction={updateBusinessAction.bind(null, id)}
      />
    </div>
  );
}
