import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createDiscoveryJobAction } from "@/app/admin/ingestion/actions";

export default async function AdminIngestionPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const [{ data: towns }, { data: categories }] = await Promise.all([
    supabase.from("towns").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Ingestion</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Queue a Google Places discovery job. Optional “run now” uses your server Places key.
        </p>
      </div>
      <form
        action={createDiscoveryJobAction}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-700">Town</label>
          <select
            name="town_id"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          >
            {(towns ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name as string}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Category</label>
          <select
            name="category_id"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          >
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name as string}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Query string</label>
          <input
            name="query_string"
            placeholder="e.g. sushi in Seaside FL (optional if variants below)"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="expand_variants" />
          Add multi-query variants (category + town templates from the plan)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="run_now" />
          Run first queued job immediately (Places API key required)
        </label>
        <button
          type="submit"
          className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Queue job
        </button>
      </form>
    </div>
  );
}
