import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  findDuplicatePairs,
  type BusinessStub,
} from "@/lib/admin/duplicate-detection";
import { mergeDuplicateAction } from "@/app/admin/duplicates/actions";

export default async function AdminDuplicatesPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from("businesses")
    .select("id, name, town_id, lat, lng, status")
    .eq("status", "active")
    .limit(400);

  if (error) return <p className="text-red-600">{error.message}</p>;

  const stubs = (rows ?? []) as BusinessStub[];
  const pairs = findDuplicatePairs(stubs, { maxDistanceM: 120, minNameSim: 0.72 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Duplicate candidates</h1>
        <p className="text-sm text-zinc-600">
          Heuristic: same town bucket, within ~120m, name similarity ≥ 0.72. Max 400
          active rows scanned — refine in SQL later with pg_trgm.
        </p>
      </div>
      {pairs.length === 0 ? (
        <p className="text-zinc-600">No pairs matched the current thresholds.</p>
      ) : (
        <ul className="space-y-4">
          {pairs.slice(0, 40).map((p) => (
            <li
              key={`${p.a.id}-${p.b.id}`}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-zinc-900">{p.a.name}</p>
                  <p className="text-sm text-zinc-500">ID {p.a.id}</p>
                  <p className="mt-2 font-medium text-zinc-900">{p.b.name}</p>
                  <p className="text-sm text-zinc-500">ID {p.b.id}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    ~{p.distanceM.toFixed(0)}m · name sim {p.nameSim.toFixed(2)}
                  </p>
                </div>
                <form action={mergeDuplicateAction} className="flex flex-col gap-2">
                  <input type="hidden" name="keep_id" value={p.a.id} />
                  <input type="hidden" name="merge_id" value={p.b.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
                  >
                    Keep A, hide B
                  </button>
                </form>
                <form action={mergeDuplicateAction} className="flex flex-col gap-2">
                  <input type="hidden" name="keep_id" value={p.b.id} />
                  <input type="hidden" name="merge_id" value={p.a.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                  >
                    Keep B, hide A
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
