import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { TopicMiningForm } from "./topic-mining-form";
import {
  candidateDecisionAction,
  queueRemoveFormAction,
} from "./actions";

export default async function TopicMiningAdminPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();

  const [{ data: regions }, { data: candidates }, { data: queue }, { count: auditCount }] =
    await Promise.all([
      supabase.from("regions").select("id, name").order("name"),
      supabase
        .from("category_candidates")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(150),
      supabase
        .from("category_build_queue")
        .select("id, priority, suggested_slug, status, created_at, candidate_id")
        .order("created_at", { ascending: false })
        .limit(80),
      supabase.from("mining_run_audit").select("id", { count: "exact", head: true }),
    ]);

  const candById = new Map(
    (candidates ?? []).map((c) => [c.id as number, c]),
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Topic mining</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Privacy-safe extraction → <code className="text-xs">category_candidates</code> → review →{" "}
          <code className="text-xs">category_build_queue</code>. Does not publish to live categories.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Mining runs logged (counts only): {auditCount ?? 0} total. Design:{" "}
          <code className="text-xs">docs/DESIGN-PRIVACY-SAFE-HTML-TOPIC-MINING.md</code>
        </p>
      </div>

      <TopicMiningForm regions={(regions ?? []) as { id: number; name: string }[]} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Candidates</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Intent</th>
                <th className="px-3 py-2">Freq</th>
                <th className="px-3 py-2">Conf</th>
                <th className="px-3 py-2">Local</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(candidates ?? []).length ? (
                (candidates ?? []).map((c) => (
                  <tr key={c.id as number} className="border-b border-zinc-100">
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {c.normalized_category as string}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{c.category_type as string}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {(c.intent_type as string) ?? "—"}
                    </td>
                    <td className="px-3 py-2">{c.frequency as number}</td>
                    <td className="px-3 py-2">{Number(c.confidence_score).toFixed(2)}</td>
                    <td className="px-3 py-2">{Number(c.local_relevance_score).toFixed(2)}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-xs text-zinc-500">
                      {c.source_type as string}
                    </td>
                    <td className="px-3 py-2 text-xs">{c.approval_status as string}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <form action={candidateDecisionAction}>
                          <input type="hidden" name="candidate_id" value={c.id as number} />
                          <input type="hidden" name="status" value="approved" />
                          <button
                            type="submit"
                            className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={candidateDecisionAction}>
                          <input type="hidden" name="candidate_id" value={c.id as number} />
                          <input type="hidden" name="status" value="rejected" />
                          <button
                            type="submit"
                            className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                          >
                            Reject
                          </button>
                        </form>
                        <form action={candidateDecisionAction}>
                          <input type="hidden" name="candidate_id" value={c.id as number} />
                          <input type="hidden" name="status" value="suppressed" />
                          <button
                            type="submit"
                            className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                          >
                            Suppress
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-zinc-500">
                    No candidates yet. Run mining on sample HTML (e.g. repeat “yoga” and “brunch”
                    phrases to pass thresholds).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Build queue</h2>
        <p className="text-sm text-zinc-600">
          Approved items only. Taxonomy / ingestion still manual — this queue is a work list.
        </p>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(queue ?? []).length ? (
                (queue ?? []).map((q) => {
                  const cid = q.candidate_id as number;
                  const cand = candById.get(cid);
                  return (
                    <tr key={q.id as number} className="border-b border-zinc-100">
                      <td className="px-3 py-2 font-mono text-xs">
                        {q.suggested_slug as string}
                      </td>
                      <td className="px-3 py-2">
                        {(cand?.normalized_category as string) ?? `id ${cid}`}
                      </td>
                      <td className="px-3 py-2">{q.status as string}</td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {new Date(q.created_at as string).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <form action={queueRemoveFormAction}>
                          <input type="hidden" name="queue_id" value={q.id as number} />
                          <button
                            type="submit"
                            className="text-xs text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-zinc-500">
                    Queue is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
