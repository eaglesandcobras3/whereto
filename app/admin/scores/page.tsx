import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export default async function AdminScoresPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from("businesses")
    .select(
      "id, name, confidence_score, freshness_score, engagement_score, status, bad_experience_unique_users",
    )
    .eq("status", "active")
    .limit(500);

  if (error) return <p className="text-red-600">{error.message}</p>;

  const list = rows ?? [];
  const n = list.length || 1;
  const avg = (key: string) =>
    list.reduce((s, r) => s + Number((r as Record<string, unknown>)[key] ?? 0), 0) / n;
  const lowConf = list.filter((r) => Number(r.confidence_score) < 0.5).length;
  const lowFresh = list.filter((r) => Number(r.freshness_score) < 0.35).length;
  const feedbackHeavy = list.filter((r) => Number(r.bad_experience_unique_users) >= 2).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Scores snapshot</h1>
        <p className="text-sm text-zinc-600">
          From up to 500 active businesses. Nightly job updates precomputed scores.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Avg confidence</p>
          <p className="text-2xl font-semibold">{avg("confidence_score").toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Avg freshness</p>
          <p className="text-2xl font-semibold">{avg("freshness_score").toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Avg engagement</p>
          <p className="text-2xl font-semibold">{avg("engagement_score").toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Sample size</p>
          <p className="text-2xl font-semibold">{list.length}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
        <span className="rounded-lg bg-amber-50 px-3 py-2">
          Low confidence (&lt;0.5): <strong>{lowConf}</strong>
        </span>
        <span className="rounded-lg bg-amber-50 px-3 py-2">
          Low freshness (&lt;0.35): <strong>{lowFresh}</strong>
        </span>
        <span className="rounded-lg bg-red-50 px-3 py-2">
          Bad exp. users ≥2: <strong>{feedbackHeavy}</strong>
        </span>
      </div>
      <div>
        <h2 className="mb-2 text-lg font-medium text-zinc-900">Lowest confidence (top 25)</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Conf</th>
                <th className="px-3 py-2">Fresh</th>
                <th className="px-3 py-2">Eng</th>
                <th className="px-3 py-2">Bad exp.</th>
              </tr>
            </thead>
            <tbody>
              {[...list]
                .sort(
                  (a, b) =>
                    Number(a.confidence_score) - Number(b.confidence_score),
                )
                .slice(0, 25)
                .map((r) => (
                  <tr key={r.id as string} className="border-b border-zinc-100">
                    <td className="px-3 py-2">
                      <a
                        href={`/admin/businesses/${r.id}`}
                        className="text-teal-700 hover:underline"
                      >
                        {r.name as string}
                      </a>
                    </td>
                    <td className="px-3 py-2">{String(r.confidence_score)}</td>
                    <td className="px-3 py-2">{String(r.freshness_score)}</td>
                    <td className="px-3 py-2">{String(r.engagement_score)}</td>
                    <td className="px-3 py-2">{String(r.bad_experience_unique_users)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
