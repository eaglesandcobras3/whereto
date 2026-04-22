import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listContentEntriesPage, listContentEntryTypes } from "@/lib/data/content-entries";
import { deleteContentEntryAction, ingestMarkdownContentAction } from "./actions";
import { ContentMarkdownIngestForm } from "./markdown-ingest-form";

type Props = {
  searchParams?: Promise<{
    type?: string;
    status?: "draft" | "published" | "archived";
    page?: string;
  }>;
};

const PAGE_SIZE = 25;
const CORE_CONTENT_TYPES = [
  "guide",
  "town",
  "area",
  "event",
  "seasonal",
  "business",
  "service",
  "page",
] as const;

function buildQuery(params: { type?: string; status?: string; page?: number }) {
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.status) q.set("status", params.status);
  if (params.page && params.page > 1) q.set("page", String(params.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function AdminContentIndexPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = (await searchParams) ?? {};
  const selectedType = (sp.type ?? "").trim();
  const selectedStatus = (sp.status ?? "").trim() as "draft" | "published" | "archived" | "";
  const currentPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [types, pageData] = await Promise.all([
    listContentEntryTypes(),
    selectedType
      ? listContentEntriesPage({
          type: selectedType,
          status: selectedStatus || undefined,
          limit: PAGE_SIZE,
          offset,
        })
      : Promise.resolve({ entries: [], total: 0 }),
  ]);
  const typeOptions = [...new Set([...CORE_CONTENT_TYPES, ...types])];
  const entries = pageData.entries;
  const total = pageData.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Content</h1>
          <p className="mt-1 text-sm text-zinc-600">Database-first CMS entries (ACF-style fields supported).</p>
        </div>
        <Link
          href="/admin/content/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          New Entry
        </Link>
      </div>

      <ContentMarkdownIngestForm action={ingestMarkdownContentAction} />

      <form className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Type</label>
            <select
              name="type"
              defaultValue={selectedType}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Select type...</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-zinc-500">Status</label>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Apply
            </button>
            <Link
              href="/admin/content"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Reset
            </Link>
          </div>
          <p className="text-xs text-zinc-500 sm:text-right">
            {selectedType ? `Showing ${entries.length} of ${total} entries` : "Select a type to view results"}
          </p>
        </div>
      </form>

      {selectedType ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-mono text-xs">{entry.content_type}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{entry.title}</td>
                    <td className="px-4 py-3 text-zinc-600">{entry.slug}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(entry.updated_at as string).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/content/${entry.id}`}
                          className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-semibold hover:bg-zinc-50"
                        >
                          Edit
                        </Link>
                        <form action={deleteContentEntryAction.bind(null, entry.id as string)}>
                          <button
                            type="submit"
                            className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
            <p className="text-zinc-600">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              {prevPage ? (
                <Link
                  href={`/admin/content${buildQuery({ type: selectedType, status: selectedStatus, page: prevPage })}`}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-400">Previous</span>
              )}
              {nextPage ? (
                <Link
                  href={`/admin/content${buildQuery({ type: selectedType, status: selectedStatus, page: nextPage })}`}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-zinc-400">Next</span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
          Select a content type to load entries.
        </div>
      )}
    </div>
  );
}

