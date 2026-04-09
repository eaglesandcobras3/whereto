import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { planDiscoveryAction } from "./actions";
import Link from "next/link";

export default async function AdminDiscoveryPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  const { data: stats } = await supabase.rpc("get_discovery_stats");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Discovery Queue</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Paste categories to expand them into AI-planned search passes.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-900">Plan New Discovery</h2>
          <form
            action={planDiscoveryAction}
            className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label className="block text-sm font-medium text-zinc-700">Parent Category</label>
              <p className="mb-2 text-xs text-zinc-500">The live category these will be mapped to.</p>
              <select
                name="category_id"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Inputs (One per line)</label>
              <p className="mb-2 text-xs text-zinc-500">AI will expand these into 10-15 passes each.</p>
              <textarea
                name="categories"
                placeholder="e.g.&#10;restaurants&#10;coffee shops&#10;family photographers"
                required
                rows={8}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 transition-colors"
            >
              Generate & Queue Plan
            </button>
          </form>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-900">Coverage Awareness</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Passes</th>
                  <th className="px-4 py-3">Unique Found</th>
                  <th className="px-4 py-3">Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(stats ?? []).map((s: any) => (
                  <tr key={s.parent_category_name}>
                    <td className="px-4 py-3 font-medium text-zinc-900">{s.parent_category_name}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {s.completed_passes} / {s.total_passes}
                    </td>
                    <td className="px-4 py-3 text-teal-700 font-bold">{s.total_unique}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600">{(s.yield_ratio * 100).toFixed(1)}%</span>
                        <div className="h-1.5 w-16 rounded-full bg-zinc-100 overflow-hidden">
                          <div 
                            className="h-full bg-teal-500" 
                            style={{ width: `${Math.min(s.yield_ratio * 100, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!stats || stats.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 italic">
                      No discovery data yet. Plan some categories to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 space-y-4">
            <p className="text-xs text-zinc-500">
              Yield tracking helps identify diminishing returns. If yield falls below 5%, consider adjusting strategies.
            </p>
            <div className="flex gap-4">
              <Link
                href="/admin/jobs"
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                Monitor Active Jobs →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
