"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function AcceptInviteWithToken({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState<string | null>(null);
  const [businessTitle, setBusinessTitle] = useState<string | null>(null);

  useEffect(() => {
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

  if (status === "working") {
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

export function PortalAcceptInviteClient({ token }: { token: string }) {
  if (!token) {
    return (
      <div>
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Missing invite token.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return <AcceptInviteWithToken token={token} />;
}
