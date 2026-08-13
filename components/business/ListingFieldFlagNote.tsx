"use client";

import Link from "next/link";
import { useState } from "react";
import { useFeedbackFeatureEnabled } from "@/lib/feature-flags-client-utils";
import {
  listingFieldFlagPlaceholder,
  listingFieldFlagPrompt,
  type ListingFieldFlagEntity,
  type ListingFieldFlagField,
} from "@/lib/listing-requests/listing-field-flag";

type Props = {
  entity: ListingFieldFlagEntity;
  entityId?: string;
  field: ListingFieldFlagField;
  className?: string;
  /** Optional “Add a business” link next to the suggest control. */
  addHref?: string;
  addLabel?: string;
  /** Browse section the visitor is looking at. */
  section?: string;
  pageTitle?: string;
  pageSlug?: string;
};

/**
 * Compact suggest control for a listing section or hub gap (missing business / category / guide).
 * Gated by PostHog `feedback` (parents should also gate; this is a client safety net).
 * An `addHref` still shows when feedback is off.
 */
export function ListingFieldFlagNote({
  entity,
  entityId,
  field,
  className = "",
  addHref,
  addLabel = "Add a business",
  section,
  pageTitle,
  pageSlug,
}: Props) {
  const feedbackEnabled = useFeedbackFeatureEnabled();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = listingFieldFlagPrompt(field);
  const placeholder = listingFieldFlagPlaceholder(field);
  const linkCn = "text-[11px] text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline";

  if (!feedbackEnabled && !addHref) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/listing-field-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          entity,
          entity_id: entityId,
          field,
          note: note.trim() || undefined,
          section: section || undefined,
          page_title: pageTitle || undefined,
          page_slug: pageSlug || undefined,
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        detail?: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
      if (!res.ok) {
        console.error("[listing-field-flag] save failed", res.status, j);
        const fieldMsg = Object.values(j.fieldErrors ?? {})
          .flatMap((msgs) => msgs ?? [])
          .find((m) => typeof m === "string" && m.trim());
        const detail = typeof j.detail === "string" && j.detail.trim() ? j.detail.trim() : null;
        throw new Error(
          fieldMsg ||
            (detail ? `${j.error ?? "Could not send report"} (${detail})` : j.error) ||
            "Could not send report",
        );
      }
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
      <p className={`mt-1.5 text-[11px] text-zinc-500 ${className}`}>
        Thanks — we&apos;ll review this.
      </p>
    );
  }

  const addLink = addHref ? (
    <Link href={addHref} className={linkCn}>
      {addLabel}
    </Link>
  ) : null;

  if (!feedbackEnabled) {
    return addLink ? <div className={`mt-1.5 ${className}`}>{addLink}</div> : null;
  }

  return (
    <div className={`mt-1.5 ${className}`}>
      {!open ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <button type="button" onClick={() => setOpen(true)} className={linkCn}>
            {prompt}
          </button>
          {addLink ? (
            <>
              <span className="text-[11px] text-zinc-300" aria-hidden>
                ·
              </span>
              {addLink}
            </>
          ) : null}
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-2.5">
          <p className="text-[11px] font-medium text-zinc-700">{prompt}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={placeholder}
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
              {busy ? "Sending…" : "Send"}
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
