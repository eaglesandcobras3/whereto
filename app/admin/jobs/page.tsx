import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export default async function AdminJobsPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from("search_jobs")
    .select(
      "id, job_type, status, priority, query_string, town_id, category_id, last_run_at, error_message, new_businesses_count, results_count",
    )
    .order("id", { ascending: false })
    .limit(200);

  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Search jobs</h1>
          <p className="text-sm text-zinc-600">Latest 200 rows.</p>
        </div>
        <Link
          href="/admin/ingestion"
          className="text-sm font-medium text-teal-700 hover:underline"
        >
          Queue new job
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Query / Category</th>
              <th className="px-3 py-2">Results</th>
              <th className="px-3 py-2">New</th>
              <th className="px-3 py-2">Last run</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((j) => (
              <tr key={j.id as number} className="border-b border-zinc-100">
                <td className="px-3 py-2 font-mono text-xs">{j.id as number}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    j.status === 'completed' ? 'bg-teal-100 text-teal-800' : 
                    j.status === 'running' ? 'bg-blue-100 text-blue-800' : 
                    j.status === 'failed' ? 'bg-red-100 text-red-800' : 
                    'bg-zinc-100 text-zinc-800'
                  }`}>
                    {j.status as string}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="max-w-[200px] truncate font-medium" title={String(j.query_string ?? "")}>
                    {j.query_string as string || "—"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Category ID: {j.category_id as number || "—"}
                  </div>
                </td>
                <td className="px-3 py-2">{j.results_count as number ?? "—"}</td>
                <td className="px-3 py-2 font-bold text-teal-700">{j.new_businesses_count as number ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {j.last_run_at
                    ? new Date(j.last_run_at as string).toLocaleString()
                    : "—"}
                </td>
                <td className="max-w-[150px] truncate px-3 py-2 text-xs text-red-600">
                  {(j.error_message as string) ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <Link 
                    href={`/admin/businesses?category_id=${j.category_id}&town_id=${j.town_id}`}
                    className="text-xs text-teal-700 hover:underline font-medium"
                  >
                    View Businesses
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
