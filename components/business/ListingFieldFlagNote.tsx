"use client";

import { useState } from "react";
import { useFeedbackFeatureEnabled } from "@/lib/feature-flags-client-utils";
import {
  LISTING_FIELD_FLAG_LABELS,
  type ListingFieldFlagEntity,
  type ListingFieldFlagField,
} from "@/lib/listing-requests/listing-field-flag";

type Props = {
  entity: ListingFieldFlagEntity;
  entityId: string;
  field: ListingFieldFlagField;
  className?: string;
};

/**
 * Compact “something wrong?” control under unverified listing fields.
 * Gated by PostHog `feedback` (parents should also gate; this is a client safety net).
 */
export function ListingFieldFlagNote({ entity, entityId, field, className = "" }: Props) {
  const feedbackEnabled = useFeedbackFeatureEnabled();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = LISTING_FIELD_FLAG_LABELS[field];

  if (!feedbackEnabled) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/listing-field-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          entity_id: entityId,
          field,
          note: note.trim() || undefined,
          reporter_email: email.trim() || undefined,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Could not send report");
      setDone(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send report");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className={`mt-1 text-[11px] text-zinc-500 ${className}`}>
        Thanks — we&apos;ll review the {label.toLowerCase()}.
      </p>
    );
  }

  return (
    <div className={`mt-1 ${className}`}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
        >
          Is this {label.toLowerCase()} wrong?
        </button>
      ) : (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2.5">
          <p className="text-[11px] font-medium text-zinc-700">
            Report incorrect {label.toLowerCase()}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="What’s wrong? (optional)"
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={320}
            placeholder="Email if you want a reply (optional)"
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
          />
          {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send report"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-md px-2.5 py-1 text-[11px] text-zinc-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
