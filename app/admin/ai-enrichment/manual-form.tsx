"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateManualPrompt, type BusinessForPrompt } from "@/lib/ai/enrich-business";
import { saveEnrichmentAction } from "./actions";

export function ManualEnrichmentForm({ businesses }: { businesses: BusinessForPrompt[] }) {
  const router = useRouter();
  const [jsonResponse, setJsonResponse] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const prompt = generateManualPrompt(businesses);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!jsonResponse.trim()) {
      setStatus("error");
      setMessage("Paste the JSON response from ChatGPT first");
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const result = await saveEnrichmentAction(jsonResponse);
      if (result.errors.length > 0) {
        setStatus("error");
        setMessage(`Saved ${result.saved}, failed ${result.failed}: ${result.errors.slice(0, 3).join(", ")}`);
      } else {
        setStatus("success");
        setMessage(`Successfully saved ${result.saved} businesses!`);
        setJsonResponse("");
        router.refresh();
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to save");
    }
  }

  if (businesses.length === 0) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
        <p className="text-sm font-medium text-teal-800">
          All businesses have been enriched!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Copy prompt */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">
          Step 1: Copy this prompt
        </h2>
        <p className="text-sm text-zinc-600 mb-4">
          {businesses.length} businesses ready for enrichment. Copy and paste into ChatGPT.
        </p>
        <div className="relative">
          <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-50 p-4 text-xs text-zinc-700 border border-zinc-200">
            {prompt}
          </pre>
          <button
            onClick={copyPrompt}
            className="absolute top-2 right-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Step 2: Paste response */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">
          Step 2: Paste ChatGPT response
        </h2>
        <p className="text-sm text-zinc-600 mb-4">
          Paste the JSON that ChatGPT gives you back.
        </p>
        <textarea
          value={jsonResponse}
          onChange={(e) => setJsonResponse(e.target.value)}
          placeholder='{"uuid-1": {"vibe": [...], "goodFor": [...], "nearbyContext": "..."}, ...}'
          rows={10}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
        />
      </div>

      {/* Step 3: Save */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Step 3: Save to database
        </h2>
        <button
          onClick={handleSave}
          disabled={status === "saving" || !jsonResponse.trim()}
          className="rounded-lg bg-teal-700 px-6 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save Results"}
        </button>
        {message && (
          <p className={`mt-3 text-sm ${status === "error" ? "text-red-600" : "text-teal-700"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
