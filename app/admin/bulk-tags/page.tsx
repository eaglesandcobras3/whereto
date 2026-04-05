import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { applyBulkTagsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminBulkTagsPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, slug, category")
    .order("category")
    .order("name");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Bulk tag assignment</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Apply one tag to many businesses (UUIDs). Uses admin source; upserts without removing other
          tags.
        </p>
      </div>
      <form action={applyBulkTagsAction} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Tag</label>
          <select
            name="tag_id"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {(tags ?? []).map((t) => (
              <option key={t.id as number} value={t.id as number}>
                {(t.name as string) ?? t.slug} ({t.category as string})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Business IDs (UUID, one per line or comma-separated)
          </label>
          <textarea
            name="business_ids"
            required
            rows={8}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
            placeholder="550e8400-e29b-41d4-a716-446655440000"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900"
        >
          Apply tag
        </button>
      </form>
    </div>
  );
}
