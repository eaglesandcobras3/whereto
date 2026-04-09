import { requireAdmin } from "@/lib/admin/require-admin";
import { getEnrichmentStats } from "@/lib/ai/enrich-business";
import { runEnrichmentBatchAction } from "./actions";

export default async function AIEnrichmentPage() {
  await requireAdmin();
  const stats = await getEnrichmentStats();
  const percentComplete = stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">AI Enrichment</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Generate AI reasoning, vibe tags, and context for businesses. Processes in batches to control costs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Total Businesses</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Enriched</p>
          <p className="mt-2 text-3xl font-bold text-teal-700">{stats.enriched.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{stats.pending.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-700">Progress</span>
          <span className="text-sm font-bold text-zinc-900">{percentComplete}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {stats.enriched} of {stats.total} businesses have AI reasoning
        </p>
      </div>

      {/* Run batch form */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Run Enrichment Batch</h2>
        <p className="text-sm text-zinc-600 mb-4">
          Click to process a batch of businesses. Uses GPT-4o-mini (~$0.15/1K input, $0.60/1K output tokens).
          Estimated cost: ~$0.01-0.02 per business.
        </p>

        {stats.pending > 0 ? (
          <form action={runEnrichmentBatchAction} className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-zinc-700">Batch size:</label>
              <select
                name="batchSize"
                defaultValue="50"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="10">10 businesses (~$0.10-0.20)</option>
                <option value="25">25 businesses (~$0.25-0.50)</option>
                <option value="50">50 businesses (~$0.50-1.00)</option>
                <option value="100">100 businesses (~$1.00-2.00)</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-6 py-3 text-sm font-bold text-white hover:bg-teal-800 transition-colors"
            >
              Process Batch
            </button>
          </form>
        ) : (
          <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
            <p className="text-sm font-medium text-teal-800">
              All businesses have been enriched!
            </p>
          </div>
        )}
      </div>

      {/* Cost estimate */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">Cost Estimate</h3>
        <p className="text-sm text-amber-800">
          To enrich all {stats.pending.toLocaleString()} remaining businesses:
          <br />
          <span className="font-bold">~${(stats.pending * 0.015).toFixed(2)} - ${(stats.pending * 0.02).toFixed(2)}</span>
          {" "}(at ~$0.015-0.02 per business)
        </p>
      </div>
    </div>
  );
}
