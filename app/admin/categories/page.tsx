import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import Link from "next/link";
import {
  addCategoryAction,
  addToQueueAction,
  completeQueueItemAction,
  deleteQueueItemAction,
} from "./actions";

export default async function CategoriesAdminPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const [{ data: categories }, { data: queue }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("category_build_queue").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Categories</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Current live categories and the build queue for upcoming ones.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/topic-mining"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Topic Mining
          </Link>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Current Categories */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Live Categories</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Types</th>
                </tr>
              </thead>
              <tbody>
                {(categories ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-900">{c.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{c.slug}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {((c.google_types as string[]) ?? []).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={addCategoryAction} className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
            <h3 className="text-sm font-medium text-zinc-900">Add Live Category</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="name"
                placeholder="Name (e.g. Yoga Studios)"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                name="slug"
                placeholder="slug (e.g. yoga-studios)"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              name="google_types"
              placeholder="Google Types (comma separated)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Add Live Category
            </button>
          </form>
        </section>

        {/* Build Queue */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Category Build Queue</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Slug / Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(queue ?? []).length ? (
                  (queue ?? []).map((q) => (
                    <tr key={q.id} className="border-b border-zinc-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900">{q.suggested_slug}</div>
                        <div className="text-xs text-zinc-500">
                          {(q.payload_json as any)?.normalized_category || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            q.status === "completed"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {q.status !== "completed" && (
                            <form action={completeQueueItemAction.bind(null, q.id)}>
                              <button className="text-xs text-teal-700 hover:underline">Complete</button>
                            </form>
                          )}
                          <form action={deleteQueueItemAction.bind(null, q.id)}>
                            <button className="text-xs text-red-700 hover:underline">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-500">
                      Queue is empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form action={addToQueueAction} className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
            <h3 className="text-sm font-medium text-zinc-900">Add to Queue</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="name"
                placeholder="Suggested Name"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                name="slug"
                placeholder="Suggested Slug"
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Add to Build Queue
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
