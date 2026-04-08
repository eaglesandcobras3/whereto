import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const supabase = getServiceSupabase();
  const term = (q ?? "").trim();

  let query = supabase
    .from("businesses")
    .select("id, name, status, town_id, category_id, listing_rating, confidence_score")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (term) {
    query = query.ilike("name", `%${term}%`);
  }

  const { data: rows, error } = await query;
  if (error) {
    return <p className="text-red-600">{error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Businesses</h1>
          <p className="text-sm text-zinc-600">Up to 100 results. Use search to narrow.</p>
        </div>
        <form className="flex gap-2" action="/admin/businesses" method="get">
          <input
            name="q"
            defaultValue={term}
            placeholder="Search name…"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((b) => (
              <tr key={b.id as string} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {b.name as string}
                </td>
                <td className="px-4 py-3 text-zinc-600">{b.status as string}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {b.listing_rating != null ? String(b.listing_rating) : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {b.confidence_score != null ? String(b.confidence_score) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/businesses/${b.id}`}
                    className="text-teal-700 hover:underline"
                  >
                    Edit
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
