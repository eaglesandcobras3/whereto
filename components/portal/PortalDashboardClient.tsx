"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { planDisplayName } from "@/lib/portal/entitlements";

type Business = {
  id: string;
  title: string;
  slug: string;
  role: string;
  claim_status: string;
  plan: string;
};

type ReviewItem = {
  id: string;
  type: string;
  status: string;
  business_id: string | null;
  payload: Record<string, unknown>;
  admin_notes: string | null;
  created_at: string;
};

function reviewLabel(item: ReviewItem): string {
  const title =
    (typeof item.payload.title === "string" ? item.payload.title : null) ??
    (typeof item.payload.business_title === "string" ? item.payload.business_title : null);
  const typeLabel =
    item.type === "claim"
      ? "Claim"
      : item.type === "new_listing"
        ? "New listing"
        : item.type === "edit"
          ? "Edit"
          : item.type === "photo"
            ? "Photo"
            : item.type;
  return title ? `${typeLabel}: ${title}` : typeLabel;
}

export function PortalDashboardClient() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [pending, setPending] = useState<ReviewItem[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/businesses")
      .then(async (res) => {
        const j = (await res.json()) as {
          businesses?: Business[];
          pending?: ReviewItem[];
          recent_decisions?: ReviewItem[];
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Could not load dashboard");
        setBusinesses(j.businesses ?? []);
        setPending(j.pending ?? []);
        setRecentDecisions(j.recent_decisions ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading your businesses…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-10">
      {pending.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Awaiting review
          </h2>
          <ul className="mt-4 space-y-3">
            {pending.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-[var(--color-text-secondary)]"
              >
                <span className="font-medium text-[var(--color-text-primary)]">{reviewLabel(item)}</span>
                <span className="mt-1 block text-xs text-[var(--color-text-tertiary)]">
                  Submitted {new Date(item.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentDecisions.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Recent decisions
          </h2>
          <ul className="mt-4 space-y-3">
            {recentDecisions.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  item.status === "needs_changes"
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-red-200 bg-red-50 text-red-950"
                }`}
              >
                <span className="font-medium">
                  {item.status === "needs_changes" ? "Changes requested" : "Not approved"}: {reviewLabel(item)}
                </span>
                {item.admin_notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm opacity-90">Note: {item.admin_notes}</p>
                ) : null}
                <span className="mt-2 block text-xs opacity-70">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Your businesses
          </h2>
          <Link
            href="/portal/businesses/new"
            className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add business
          </Link>
        </div>

        {businesses.length === 0 ? (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-5 py-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              You don&apos;t manage any listings yet. Claim an existing business from its page, or add a new one.
            </p>
            <Link
              href="/portal/businesses/new"
              className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              List a new business
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {businesses.map((b) => {
              const businessPending = pending.filter((p) => p.business_id === b.id);
              return (
                <li
                  key={b.id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">{b.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                      {planDisplayName(b.plan)} · {b.role}
                    </p>
                    {businessPending.length > 0 ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        {businessPending.length} submission{businessPending.length === 1 ? "" : "s"} awaiting review
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/portal/businesses/${encodeURIComponent(b.id)}`}
                      className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Edit listing
                    </Link>
                    <Link
                      href={`/portal/businesses/${encodeURIComponent(b.id)}/photos`}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                    >
                      Photos
                    </Link>
                    {b.role === "owner" ? (
                      <>
                        <Link
                          href={`/portal/billing?business_id=${encodeURIComponent(b.id)}`}
                          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                        >
                          Upgrade
                        </Link>
                        <Link
                          href={`/portal/businesses/${encodeURIComponent(b.id)}/team`}
                          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                        >
                          Team
                        </Link>
                      </>
                    ) : null}
                    <Link
                      href={`/business/${encodeURIComponent(b.slug)}`}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                    >
                      View listing
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
