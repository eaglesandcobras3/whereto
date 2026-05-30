"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Snapshot = {
  query?: string;
  summary?: string;
  recommendations?: Array<{
    business_id: string;
    headline: string;
    explanation: string;
    business?: { name?: string };
  }>;
};

export function LegacySharePage({ id }: { id: string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/share/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setErr("This share link is invalid or expired."));
  }, [id]);

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-muted-foreground">{err}</p>
        <Link href="/" className="mt-4 inline-block text-primary underline">
          Home
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-primary">Shared results</p>
      {data.query ? (
        <p className="mt-1 text-sm text-muted-foreground">&ldquo;{data.query}&rdquo;</p>
      ) : null}
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{data.summary}</h1>
      <ul className="mt-8 space-y-4">
        {(data.recommendations ?? []).map((r) => (
          <li key={r.business_id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium text-foreground">{r.business?.name}</p>
            <p className="text-sm text-primary">{r.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">{r.explanation}</p>
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-10 inline-block text-sm text-primary hover:underline">
        Try your own search
      </Link>
    </div>
  );
}
