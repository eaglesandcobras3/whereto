"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PortalAcceptInviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [businessTitle, setBusinessTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing invite token.");
      return;
    }

    setStatus("working");
    fetch("/api/portal/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const j = (await res.json()) as {
          businessTitle?: string;
          businessId?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Could not accept invite");
        setBusinessTitle(j.businessTitle ?? null);
        setStatus("ok");
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Could not accept invite");
      });
  }, [token]);

  if (status === "working" || status === "idle") {
    return <p className="text-sm text-[var(--color-text-secondary)]">Accepting invite…</p>;
  }

  if (status === "ok") {
    return (
      <div>
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          You&apos;re now a manager for {businessTitle ?? "this business"}.
        </p>
        <Link
          href="/portal"
          className="mt-6 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
          onClick={() => router.refresh()}
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        {message ?? "Could not accept this invite."}
      </p>
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
        Make sure you&apos;re signed in with the email that received the invite.
      </p>
      <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline">
        Sign in
      </Link>
    </div>
  );
}
