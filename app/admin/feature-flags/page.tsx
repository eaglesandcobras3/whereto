import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { toggleFeatureFlagAction, addFeatureFlagAction } from "./actions";

export default async function FeatureFlagsAdminPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const { data: flags, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("name");

  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Feature Flags</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Turn features on and off globally without deploying code.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-6 py-3">Feature Name</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Toggle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(flags ?? []).map((flag) => (
              <tr key={flag.id}>
                <td className="px-6 py-4 font-mono text-xs font-bold text-zinc-900">
                  {flag.name}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      flag.enabled
                        ? "bg-teal-100 text-teal-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {flag.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-600">{flag.description}</td>
                <td className="px-6 py-4 text-right">
                  <form action={toggleFeatureFlagAction.bind(null, flag.id, !flag.enabled)}>
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        flag.enabled
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                      }`}
                    >
                      {flag.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="max-w-xl rounded-xl border border-zinc-200 bg-zinc-50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Add New Flag</h2>
        <form action={addFeatureFlagAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase">Name</label>
            <input
              name="name"
              placeholder="e.g. holiday-banner"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase">Description</label>
            <input
              name="description"
              placeholder="What this flag controls..."
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" />
            <span>Enable immediately</span>
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Create Flag
          </button>
        </form>
      </div>
    </div>
  );
}
