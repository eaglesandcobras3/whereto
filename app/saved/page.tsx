"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SaveRow = {
  id: number;
  businesses: {
    id: string;
    name: string;
    address: string | null;
    google_rating: number | null;
    ai_summary: string | null;
  } | null;
};

export default function SavedPage() {
  const [saves, setSaves] = useState<SaveRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/saves")
      .then((r) => {
        if (r.status === 401) {
          setError("sign_in_required");
          return null;
        }
        return r.json();
      })
      .then((j) => {
        if (j?.saves) setSaves(j.saves);
        else if (j?.error) setError(j.error);
      })
      .catch(() => setError("load_failed"));
  }, []);

  if (error === "sign_in_required") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-700">Sign in to see saved places.</p>
        <Link href="/login" className="mt-4 inline-block text-teal-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Saved</h1>
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          Search
        </Link>
      </div>
      {saves === null ? (
        <p className="text-zinc-500">Loading…</p>
      ) : saves.length === 0 ? (
        <p className="text-zinc-600">No saves yet.</p>
      ) : (
        <ul className="space-y-4">
          {saves.map((s) =>
            s.businesses ? (
              <li
                key={s.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium text-zinc-900">{s.businesses.name}</p>
                {s.businesses.address ? (
                  <p className="text-sm text-zinc-600">{s.businesses.address}</p>
                ) : null}
                {s.businesses.google_rating != null ? (
                  <p className="mt-1 text-sm text-amber-700">
                    ★ {s.businesses.google_rating}
                  </p>
                ) : null}
                {s.businesses.ai_summary ? (
                  <p className="mt-2 text-sm text-zinc-700">{s.businesses.ai_summary}</p>
                ) : null}
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}
