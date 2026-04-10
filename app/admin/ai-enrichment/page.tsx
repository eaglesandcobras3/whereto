import { requireAdmin } from "@/lib/admin/require-admin";
import { getEnrichmentStats, getBusinessesForManualEnrichment } from "@/lib/ai/enrich-business";
import { ManualEnrichmentForm } from "./manual-form";

export default async function AIEnrichmentPage() {
  await requireAdmin();
  const stats = await getEnrichmentStats();
  const percentComplete = stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0;

  // Get businesses for manual enrichment (up to 20)
  const businessesForPrompt = await getBusinessesForManualEnrichment(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">AI Enrichment</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Generate AI reasoning, vibe tags, and context for businesses.
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
      </div>

      {/* Manual enrichment */}
      {stats.pending > 0 ? (
        <ManualEnrichmentForm businesses={businessesForPrompt} />
      ) : (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
          <p className="text-sm font-medium text-teal-800">
            All businesses have been enriched!
          </p>
        </div>
      )}
    </div>
  );
}
