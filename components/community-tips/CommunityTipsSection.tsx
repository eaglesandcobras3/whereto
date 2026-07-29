"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { tipAttributionSaid } from "@/lib/community-tips/attribution";
import type {
  CommunityTipEntityType,
  CommunityTipKind,
  PublicCommunityTip,
} from "@/lib/community-tips/schema";
import { CommunityTipsGate } from "@/components/feature-flags/CommunityTipsGate";

type Props = {
  entityType: CommunityTipEntityType;
  entityId: string;
  entityTitle: string;
  /** Server-prefetched published tips (optional). */
  initialTips?: PublicCommunityTip[];
};

function TipStars({ rating }: { rating: number }) {
  return (
    <span className="text-sm text-amber-700" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-zinc-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function CommunityTipsSectionInner({
  entityType,
  entityId,
  entityTitle,
  initialTips = [],
}: Props) {
  const [tips, setTips] = useState<PublicCommunityTip[]>(initialTips);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [attributionCity, setAttributionCity] = useState("");
  const [kind, setKind] = useState<CommunityTipKind>("tip");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const refreshPublished = useCallback(async () => {
    const res = await fetch(
      `/api/community-tips?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`,
    );
    if (!res.ok) return;
    const json = (await res.json()) as { tips?: PublicCommunityTip[] };
    setTips(json.tips ?? []);
  }, [entityType, entityId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cityRes = await fetch("/api/profile/attribution-city");
      if (cancelled) return;
      if (cityRes.status === 401) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      if (cityRes.ok) {
        const json = (await cityRes.json()) as { attribution_city?: string | null };
        setAttributionCity(json.attribution_city?.trim() ?? "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const res = await fetch("/api/community-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        kind,
        body,
        rating: kind === "review" ? rating : null,
        attribution_city: attributionCity || null,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error || "Could not submit.");
      return;
    }
    setStatus("ok");
    setMessage("Thanks — your tip is waiting for review before it appears publicly.");
    setBody("");
    setShowForm(false);
    void refreshPublished();
  }

  const nextPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  return (
    <section className="mt-10 border-t border-[var(--color-border)] pt-8 sm:mt-12">
      <h2 className="text-editorial-headline text-xl text-[var(--color-text)] sm:text-2xl">
        Visitor tips
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
        Helpful notes from people who’ve been — shown without usernames.
      </p>

      {tips.length > 0 ? (
        <ul className="mt-6 space-y-5">
          {tips.map((tip) => (
            <li key={tip.id} className="border-b border-zinc-100 pb-5 last:border-0">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                {tipAttributionSaid(tip.attribution_city)}
                {tip.kind === "review" && tip.rating != null ? (
                  <>
                    {" · "}
                    <TipStars rating={tip.rating} />
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-[var(--color-text)]">{tip.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No published tips yet for {entityTitle}.</p>
      )}

      <div className="mt-6">
        {signedIn === false ? (
          <p className="text-sm text-zinc-600">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="font-medium text-teal-700 hover:underline"
            >
              Sign in
            </Link>{" "}
            to leave a tip or review.
          </p>
        ) : signedIn === true ? (
          showForm ? (
            <form onSubmit={submit} className="max-w-xl space-y-3">
              <div className="flex gap-3 text-sm">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === "tip"}
                    onChange={() => setKind("tip")}
                  />
                  Tip
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === "review"}
                    onChange={() => setKind("review")}
                  />
                  Review
                </label>
              </div>
              {kind === "review" ? (
                <label className="block text-sm text-zinc-600">
                  Rating
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block text-sm text-zinc-600">
                City you’re from
                <input
                  required
                  value={attributionCity}
                  onChange={(e) => setAttributionCity(e.target.value)}
                  placeholder="e.g. Birmingham"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                />
                <span className="mt-1 block text-xs text-zinc-500">
                  Shown as “Someone from …” — never your name.
                </span>
              </label>
              <label className="block text-sm text-zinc-600">
                Your {kind}
                <textarea
                  required
                  minLength={15}
                  maxLength={2000}
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What should visitors know?"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {status === "loading" ? "Submitting…" : "Submit for review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700"
                >
                  Cancel
                </button>
              </div>
              {message ? (
                <p className={`text-sm ${status === "error" ? "text-red-600" : "text-emerald-700"}`}>
                  {message}
                </p>
              ) : null}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Leave a tip or review
            </button>
          )
        ) : null}
        {status === "ok" && !showForm && message ? (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>
    </section>
  );
}

export function CommunityTipsSection(props: Props) {
  return (
    <CommunityTipsGate>
      <CommunityTipsSectionInner {...props} />
    </CommunityTipsGate>
  );
}
