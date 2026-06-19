"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  businessId: string;
  businessTitle: string;
  claimStatus: string;
};

export function PortalClaimForm({ businessId, businessTitle, claimStatus }: Props) {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (claimStatus === "claimed") {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        This listing already has an approved owner.{" "}
        <Link href="/feedback" className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline">
          Contact us
        </Link>{" "}
        if you believe this is an error.
      </p>
    );
  }

  if (claimStatus === "pending_review") {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        A claim is already under review for {businessTitle}. We&apos;ll email you when it&apos;s decided.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErr(null);
    setMsg(null);

    const res = await fetch(`/api/portal/businesses/${encodeURIComponent(businessId)}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, phone, note }),
    });
    const j = (await res.json()) as { error?: string };
    setPending(false);

    if (!res.ok) {
      setErr(j.error ?? "Could not submit claim");
      return;
    }

    setMsg("Claim submitted. We'll review it and email you when it's approved.");
    router.refresh();
  }

  if (msg) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-4 text-sm text-[var(--color-text-secondary)]">
        {msg}{" "}
        <Link href="/portal" className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline">
          Back to portal
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Tell us how you&apos;re connected to <strong className="text-[var(--color-text-primary)]">{businessTitle}</strong>.
        We review every claim before assigning ownership.
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)]" htmlFor="claim-role">
          Your role
        </label>
        <input
          id="claim-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          placeholder="Owner, manager, marketing lead…"
          className="mt-1 w-full rounded-xl border border-[var(--color-border-strong)] px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)]" htmlFor="claim-phone">
          Phone (optional)
        </label>
        <input
          id="claim-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--color-border-strong)] px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)]" htmlFor="claim-note">
          How we can verify
        </label>
        <textarea
          id="claim-note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder="Website domain, social account, or other context that helps us confirm you're authorized."
          className="mt-1 w-full rounded-xl border border-[var(--color-border-strong)] px-3 py-2.5 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
