import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getTownEnrichmentStats,
  getTownsForManualEnrichment,
  generateTownPrompt
} from "@/lib/ai/enrich-town";
import { PromptWorkflow, StatsBar, BackLink } from "../components";
import { saveTownEnrichmentAction } from "./actions";

export default async function TownEnrichmentPage() {
  await requireAdmin();
  const stats = await getTownEnrichmentStats();
  const towns = await getTownsForManualEnrichment(20);
  const prompt = generateTownPrompt(towns);
  const percentComplete = stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <BackLink href="/admin/data-pipeline" label="Back to Pipeline" />

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Step 4: Town Enrichment</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Add rich AI-generated details to each town: vibes, recommendations, scores, and more.
        </p>
      </div>

      <StatsBar stats={[
        { label: "Total Towns", value: stats.total },
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
        title="Enrich Towns"
        description="Add detailed AI insights to towns"
        prompt={prompt}
        itemCount={stats.pending}
        saveAction={saveTownEnrichmentAction}
      />

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What gets generated:</h3>
        <div className="grid gap-2 sm:grid-cols-2 text-sm text-blue-800">
          <div>• Tagline & description</div>
          <div>• Vibe tags & known for</div>
          <div>• Best for / Not ideal for</div>
          <div>• Parking & walkability</div>
          <div>• Must-see spots</div>
          <div>• Hidden gems</div>
          <div>• Local tips</div>
          <div>• Food scene & nightlife</div>
          <div>• Family activities</div>
          <div>• Romantic spots</div>
          <div>• Nearby towns & day trips</div>
          <div>• Family/Romance/Nightlife/Budget scores</div>
        </div>
      </div>
    </div>
  );
}
