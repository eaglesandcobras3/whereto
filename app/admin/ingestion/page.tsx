import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { createDiscoveryJobAction, runDiscoveryNowAction } from "@/app/admin/ingestion/actions";

export default async function AdminIngestionPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const [{ data: towns }, { data: categories }] = await Promise.all([
    supabase.from("towns").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Ingestion</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Queue a discovery job here. Jobs are processed by the discovery cron.
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
              placeholder="Optional note"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="expand_variants" />
            Add multi-query variants
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="prioritize_cron" />
            Highest priority on next cron
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Queue job
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-teal-100 bg-teal-50 p-6">
        <h2 className="text-lg font-semibold text-teal-900">Immediate Run</h2>
        <p className="text-sm text-teal-700">
          Force a discovery run right now. This will process up to 5 pending jobs immediately using the Geoapify API.
        </p>
        <form action={runDiscoveryNowAction}>
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-800 px-5 py-3 text-sm font-bold text-white hover:bg-teal-900 transition-colors shadow-sm"
          >
            Trigger Discovery Now
          </button>
        </form>
      </section>
    </div>
  );
}
