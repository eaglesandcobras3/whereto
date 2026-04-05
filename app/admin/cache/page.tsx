import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { deleteCacheRowAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCachePage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data: rows } = await supabase
    .from("query_cache")
    .select(
      "id, query_hash, normalized_query, hit_count, expires_at, created_at, seo_eligible, query_key",
    )
    .order("created_at", { ascending: false })
    .limit(120);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Query cache</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Recent entries (newest first). Delete invalidates cached AI responses — next search recomputes.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Hash (prefix)</th>
              <th className="px-3 py-2">Query</th>
              <th className="px-3 py-2">Hits</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">SEO</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id as string} className="border-b border-zinc-100">
                <td className="px-3 py-2 font-mono text-xs">
                  {(r.query_hash as string).slice(0, 12)}…
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-zinc-700">
                  {(r.normalized_query as string) ?? "—"}
                </td>
                <td className="px-3 py-2">{r.hit_count as number}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {new Date(r.expires_at as string).toLocaleString()}
                </td>
                <td className="px-3 py-2">{r.seo_eligible ? "yes" : "—"}</td>
                <td className="px-3 py-2">
                  <form action={deleteCacheRowAction}>
                    <input type="hidden" name="id" value={r.id as string} />
                    <button
                      type="submit"
                      className="text-xs text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
