import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { ingestBusinessMarkdownAction } from "./actions";
import { MarkdownIngestForm } from "./markdown-ingest-form";

const PAGE_SIZE = 50;

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category_id?: string; town_id?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, category_id, town_id, page } = await searchParams;
  const flags = await getAllFeatureFlags();
  const supabase = getServiceSupabase();
  
  const term = (q ?? "").trim();
  const currentPage = Math.max(1, Number(page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("businesses")
    .select("id, name, status, town_id, category_id, listing_rating, confidence_score, towns(name)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (term) {
    query = query.ilike("name", `%${term}%`);
  }
  if (category_id) {
    query = query.eq("category_id", Number(category_id));
  }
  if (town_id) {
    query = query.eq("town_id", Number(town_id));
  }

  const { data: rows, error, count } = await query;
  if (error) {
    return <p className="text-red-600">{error.message}</p>;
  }

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  // Helper to build URLs for pagination
  const getPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category_id) params.set("category_id", category_id);
    if (town_id) params.set("town_id", town_id);
    params.set("page", String(p));
    return `/admin/businesses?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Businesses</h1>
          <p className="text-sm text-zinc-600">
            {totalCount} total results found.
          </p>
          {(category_id || town_id || term) && (
            <Link href="/admin/businesses" className="text-xs text-teal-700 hover:underline">
              Clear all filters
            </Link>
          )}
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

      <MarkdownIngestForm action={ingestBusinessMarkdownAction} />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              {flags["towns"] === true && <th className="px-4 py-3">Town</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length > 0 ? (
              (rows ?? []).map((b) => (
                <tr key={b.id as string} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {b.name as string}
                  </td>
                  {flags["towns"] === true && (
                    <td className="px-4 py-3 text-zinc-600">
                      {(() => {
                        const towns = b.towns as { name: string } | { name: string }[] | null;
                        if (!towns) return "—";
                        if (Array.isArray(towns)) return towns[0]?.name ?? "—";
                        return towns.name;
                      })()}
                    </td>
                  )}
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
              ))
            ) : (
              <tr>
                <td colSpan={flags["towns"] === true ? 6 : 5} className="px-4 py-8 text-center text-zinc-500">
                  No businesses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm border">
        <div className="flex flex-1 justify-between sm:hidden">
          {hasPrev ? (
            <Link
              href={getPageUrl(currentPage - 1)}
              className="relative inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Previous
            </Link>
          ) : <div />}
          {hasNext ? (
            <Link
              href={getPageUrl(currentPage + 1)}
              className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Next
            </Link>
          ) : <div />}
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-700">
              Showing <span className="font-medium">{from + 1}</span> to{" "}
              <span className="font-medium">{Math.min(from + PAGE_SIZE, totalCount)}</span> of{" "}
              <span className="font-medium">{totalCount}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <Link
                href={getPageUrl(currentPage - 1)}
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:z-20 focus:outline-offset-0 ${!hasPrev ? 'pointer-events-none opacity-50' : ''}`}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-300 focus:outline-offset-0">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Link
                href={getPageUrl(currentPage + 1)}
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:z-20 focus:outline-offset-0 ${!hasNext ? 'pointer-events-none opacity-50' : ''}`}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
