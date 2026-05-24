"use client";

import { useState } from "react";
import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { gaEvent } from "@/lib/analytics/gtag-runner";

type Props = {
  businessId: string;
  claimStatus: string;
  userId: string | null;
  claimedByUserId: string | null;
  /** When false, do not show sign-in / claim flow (see `auth` in FEATURE_FLAGS_JSON). */
  authEnabled?: boolean;
};

export function ClaimListingForm({
  businessId,
  claimStatus,
  userId,
  claimedByUserId,
  authEnabled = true,
}: Props) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!userId) {
    if (!authEnabled) {
      return (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          Account sign-in is not available; listing claims are disabled in this build.
        </p>
      );
    }
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <Link
          href="/login"
          {...gaClickProps({ event: "nav_click", category: "business_claim", label: "login" })}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          Sign in
        </Link>{" "}
        to submit a listing ownership request (reviewed by operators).
      </div>
    );
  }

  if (claimStatus === "claimed") {
    const yours = claimedByUserId === userId;
    return (
      <p className="text-sm text-zinc-600">
        {yours
          ? "You are recorded as the verified listing contact for this place."
          : "This listing has an approved owner on file. Contact support for disputes."}
      </p>
    );
  }

  if (claimStatus === "pending_review") {
    return (
      <p className="text-sm text-zinc-600">
        A claim is under review for this listing. You’ll be notified when the status changes.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId, note }),
    });
    const j = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setMsg(j.error ?? "Request failed");
      return;
    }
    gaEvent("claim_submit_success", { business_id: businessId });
    setMsg("Request submitted. Operators will review — no automated verification.");
    setNote("");
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Listing claim (MVP)</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Submit a short note for operators. This is not legal verification — manual review only.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          rows={3}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="How you’re associated with this business (no sensitive documents here)"
        />
        <button
          type="submit"
          disabled={pending}
          {...gaClickProps({
            event: "cta_click",
            category: "business_claim",
            label: "submit",
          })}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Request review"}
        </button>
      </form>
      {msg ? <p className="mt-2 text-sm text-zinc-700">{msg}</p> : null}
    </div>
  );
}
