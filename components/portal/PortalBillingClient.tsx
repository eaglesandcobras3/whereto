"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PlanEntitlements } from "@/lib/portal/entitlements";

type BillingBusiness = {
  id: string;
  title: string;
  slug: string;
  plan: string;
  effective_plan: string;
  entitlements: PlanEntitlements;
  subscription: {
    status: string;
    current_period_end: string | null;
    stripe_subscription_id: string | null;
  } | null;
};

const PLAN_FEATURES = [
  "Up to 2 photos",
  "Basic contact info and short description",
  "Claimed listing badge",
];

const PARTNER_FEATURES = [
  "Up to 12 photos",
  "Hours and social links",
  "Full business description",
  "Local Partner badge (coming soon)",
];

function planLabel(plan: string): string {
  if (plan === "local_partner") return "Local Partner";
  if (plan === "claimed_listing") return "Claimed listing (free)";
  return plan;
}

export function PortalBillingClient() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<BillingBusiness[]>([]);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutPending, setCheckoutPending] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const highlightId = searchParams.get("business_id")?.trim() ?? null;

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/portal/billing/checkout")
      .then(async (res) => {
        const j = (await res.json()) as {
          businesses?: BillingBusiness[];
          stripe_configured?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setBusinesses(j.businesses ?? []);
        setStripeConfigured(Boolean(j.stripe_configured));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startCheckout(businessId: string) {
    setCheckoutPending(businessId);
    setErr(null);
    const res = await fetch("/api/portal/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId }),
    });
    const j = (await res.json()) as { url?: string; error?: string };
    setCheckoutPending(null);
    if (!res.ok || !j.url) {
      setErr(j.error ?? "Could not start checkout.");
      return;
    }
    window.location.href = j.url;
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading plans…</p>;
  }

  return (
    <div>
      {success ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Payment received. Your Local Partner benefits should unlock within a minute.
        </p>
      ) : null}
      {canceled ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Checkout was canceled. You can upgrade anytime.
        </p>
      ) : null}
      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">
            Claimed listing
          </h2>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">Free</p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
            {PLAN_FEATURES.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-6">
          <h2 className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">
            Local Partner
          </h2>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">$99/year</p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
            {PARTNER_FEATURES.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">
          Your businesses
        </h2>
        {businesses.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
            You don&apos;t own any listings yet.{" "}
            <Link href="/portal" className="text-[var(--color-primary)] hover:underline">
              Go to dashboard
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {businesses.map((b) => {
              const isPartner = b.effective_plan === "local_partner";
              const highlighted = highlightId === b.id;
              return (
                <li
                  key={b.id}
                  className={`rounded-xl border p-5 ${
                    highlighted
                      ? "border-[var(--color-primary)] bg-[var(--color-surface-secondary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">
                        {b.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Current plan: {planLabel(b.effective_plan)}
                        {b.subscription?.status === "comped" ? " (comped)" : ""}
                      </p>
                      {b.subscription?.current_period_end && isPartner ? (
                        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                          Renews{" "}
                          {new Date(b.subscription.current_period_end).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isPartner ? (
                        <button
                          type="button"
                          disabled={!stripeConfigured || checkoutPending === b.id}
                          onClick={() => startCheckout(b.id)}
                          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {checkoutPending === b.id ? "Redirecting…" : "Upgrade to Local Partner"}
                        </button>
                      ) : (
                        <span className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
                          Active
                        </span>
                      )}
                      <Link
                        href={`/portal/businesses/${encodeURIComponent(b.id)}`}
                        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                      >
                        Manage listing
                      </Link>
                    </div>
                  </div>
                  {!stripeConfigured && !isPartner ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Online checkout is not configured in this environment yet.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
