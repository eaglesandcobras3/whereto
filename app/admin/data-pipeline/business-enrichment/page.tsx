import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getEnrichmentStats,
  getBusinessesForManualEnrichment,
  generateManualPrompt
} from "@/lib/ai/enrich-business";
import { PromptWorkflow, StatsBar, BackLink } from "../components";
import { saveBusinessEnrichmentAction } from "./actions";

export default async function BusinessEnrichmentPage() {
  await requireAdmin();
  const stats = await getEnrichmentStats();
  const businesses = await getBusinessesForManualEnrichment(20);
  const prompt = generateManualPrompt(businesses);
  const percentComplete = stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <BackLink href="/admin/data-pipeline" label="Back to Pipeline" />

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Step 3: Business Enrichment</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Add rich AI-generated details to each business: vibes, tips, scores, and more.
        </p>
      </div>

      <StatsBar stats={[
        { label: "Total Businesses", value: stats.total },
        { label: "Enriched", value: stats.enriched, highlight: true },
        { label: "Pending", value: stats.pending },
      ]} />

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

      <PromptWorkflow
        title="Enrich Businesses"
        description="Add detailed AI insights to businesses"
        prompt={prompt}
        itemCount={stats.pending}
        saveAction={saveBusinessEnrichmentAction}
      />

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What gets generated:</h3>
        <div className="grid gap-2 sm:grid-cols-2 text-sm text-blue-800">
          <div>• Vibe tags (casual, romantic, etc.)</div>
          <div>• Crowd type (locals, tourists, families)</div>
          <div>• Best time to visit</div>
          <div>• Parking & reservations info</div>
          <div>• Good for / Not ideal for</div>
          <div>• Pairs well with activities</div>
          <div>• One-liner pitch</div>
          <div>• Local insider tip</div>
          <div>• Highlights & must-tries</div>
          <div>• Family/Date/Value scores (1-5)</div>
        </div>
      </div>
    </div>
  );
}
