import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listContentEntries } from "@/lib/data/content-entries";
import { deleteContentEntryAction } from "./actions";

export default async function AdminContentIndexPage() {
  await requireAdmin();
  const entries = await listContentEntries({ limit: 200 });

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
    </div>
  );
}

