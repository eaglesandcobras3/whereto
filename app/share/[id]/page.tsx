"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Snapshot = {
  query?: string;
  summary?: string;
  recommendations?: Array<{
    business_id: string;
    headline: string;
    explanation: string;
    business?: { name?: string; address?: string | null; listing_rating?: number | null };
  }>;
};

export default function SharePage() {
  const params = useParams();
  const id = params.id as string;
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
        <p className="text-zinc-700">{err}</p>
        <Link href="/" className="mt-4 inline-block text-teal-700 underline">
          Home
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-teal-800">Shared results</p>
      {data.query ? (
        <p className="mt-1 text-sm text-zinc-500">&ldquo;{data.query}&rdquo;</p>
      ) : null}
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{data.summary}</h1>
      <ul className="mt-8 space-y-4">
        {(data.recommendations ?? []).map((r) => (
          <li
            key={r.business_id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-zinc-900">{r.business?.name}</p>
            <p className="text-sm text-teal-800">{r.headline}</p>
            <p className="mt-1 text-sm text-zinc-700">{r.explanation}</p>
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-10 inline-block text-sm text-teal-700 hover:underline">
        Try your own search
      </Link>
    </div>
  );
}
