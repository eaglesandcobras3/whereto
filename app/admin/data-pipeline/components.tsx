"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PromptWorkflowProps = {
  title: string;
  description: string;
  prompt: string;
  itemCount: number;
  saveAction: (json: string) => Promise<{ saved: number; failed: number; errors: string[] }>;
};

export function PromptWorkflow({ title, description, prompt, itemCount, saveAction }: PromptWorkflowProps) {
  const router = useRouter();
  const [jsonResponse, setJsonResponse] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

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
      const result = await saveAction(jsonResponse);
      if (result.errors.length > 0) {
        setStatus("error");
        setMessage(`Saved ${result.saved}, failed ${result.failed}: ${result.errors.slice(0, 3).join(", ")}`);
      } else {
        setStatus("success");
        setMessage(`Successfully saved ${result.saved} items!`);
        setJsonResponse("");
        router.refresh();
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to save");
    }
  }

  if (itemCount === 0) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
        <p className="text-sm font-medium text-teal-800">
          All items have been processed! Move to the next step.
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
          {itemCount} items ready. Copy and paste into ChatGPT.
        </p>
        <div className="relative">
          <pre className="max-h-80 overflow-auto rounded-lg bg-zinc-50 p-4 text-xs text-zinc-700 border border-zinc-200 whitespace-pre-wrap">
            {prompt}
          </pre>
          <button
            onClick={copyPrompt}
            className="absolute top-2 right-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
          >
            {copied ? "Copied!" : "Copy Prompt"}
          </button>
        </div>
      </div>

      {/* Step 2: Paste response */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">
          Step 2: Paste ChatGPT response
        </h2>
        <p className="text-sm text-zinc-600 mb-4">
          Paste the JSON that ChatGPT gives you.
        </p>
        <textarea
          value={jsonResponse}
          onChange={(e) => setJsonResponse(e.target.value)}
          placeholder="Paste the JSON response here..."
          rows={12}
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

export function StatsBar({ stats }: { stats: { label: string; value: number; highlight?: boolean }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className={`text-2xl font-bold ${stat.highlight ? "text-teal-700" : "text-zinc-900"}`}>
            {stat.value.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-teal-700 mb-6">
      ← {label}
    </a>
  );
}
