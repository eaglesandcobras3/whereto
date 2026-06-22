"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PlanEntitlements } from "@/lib/portal/entitlements";
import { planDisplayName } from "@/lib/portal/entitlements";

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
    stripe_customer_id: string | null;
  } | null;
};

type BillingEvent = {
  id: string;
  event_type: string;
  amount_cents: number | null;
  currency: string;
  description: string | null;
  created_at: string;
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

const FUTURE_TIERS = [
  { slug: "premium_partner", name: "Premium Partner", note: "Featured placement hooks (coming soon)" },
  { slug: "signature_partner", name: "Signature Partner", note: "Analytics and priority support (coming soon)" },
];

function formatMoney(cents: number | null, currency: string): string {
  if (cents == null) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PortalBillingClient() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<BillingBusiness[]>([]);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutPending, setCheckoutPending] = useState<string | null>(null);
  const [portalPending, setPortalPending] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, BillingEvent[]>>({});
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

  const loadHistory = useCallback((businessId: string) => {
    fetch(`/api/portal/billing/history?business_id=${encodeURIComponent(businessId)}`)
      .then(async (res) => {
        const j = (await res.json()) as { events?: BillingEvent[] };
        if (res.ok) {
          setHistory((prev) => ({ ...prev, [businessId]: j.events ?? [] }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    for (const b of businesses) {
      if (b.subscription?.stripe_subscription_id || b.subscription?.stripe_customer_id) {
        loadHistory(b.id);
      }
    }
  }, [businesses, loadHistory]);

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

  async function openBillingPortal(businessId: string) {
    setPortalPending(businessId);
    setErr(null);
    const res = await fetch("/api/portal/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId }),
    });
    const j = (await res.json()) as { url?: string; error?: string };
    setPortalPending(null);
    if (!res.ok || !j.url) {
      setErr(j.error ?? "Could not open billing portal.");
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

      <section className="mt-8 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)] p-5">
        <h2 className="font-headline text-sm font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Coming soon
        </h2>
        <ul className="mt-3 space-y-2">
          {FUTURE_TIERS.map((t) => (
            <li key={t.slug} className="text-sm text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text-primary)]">{t.name}</span>: {t.note}
            </li>
          ))}
        </ul>
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
              const isPaid = b.effective_plan !== "claimed_listing";
              const highlighted = highlightId === b.id;
              const isPastDue = b.subscription?.status === "past_due";
              const events = history[b.id] ?? [];

              return (
                <li
                  key={b.id}
                  className={`rounded-xl border p-5 ${
                    highlighted
                      ? "border-[var(--color-primary)] bg-[var(--color-surface-secondary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]"
                  }`}
                >
                  {isPastDue ? (
                    <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      Payment failed. Update your payment method to keep {planDisplayName(b.effective_plan)} benefits.
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-headline text-lg font-semibold text-[var(--color-text-primary)]">
                        {b.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Current plan: {planDisplayName(b.effective_plan)}
                        {b.subscription?.status === "comped" ? " (comped)" : ""}
                        {isPastDue ? " (payment issue)" : ""}
                      </p>
                      {b.subscription?.current_period_end && isPaid ? (
                        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                          Renews {new Date(b.subscription.current_period_end).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isPaid ? (
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
                      {b.subscription?.stripe_customer_id ? (
                        <button
                          type="button"
                          disabled={portalPending === b.id}
                          onClick={() => openBillingPortal(b.id)}
                          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-secondary)] disabled:opacity-50"
                        >
                          {portalPending === b.id ? "Opening…" : "Manage billing"}
                        </button>
                      ) : null}
                      <Link
                        href={`/portal/businesses/${encodeURIComponent(b.id)}`}
                        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                      >
                        Manage listing
                      </Link>
                    </div>
                  </div>

                  {events.length > 0 ? (
                    <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                        Billing history
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {events.map((ev) => (
                          <li key={ev.id} className="flex flex-wrap justify-between gap-2 text-sm">
                            <span className="text-[var(--color-text-secondary)]">
                              {new Date(ev.created_at).toLocaleDateString()} ·{" "}
                              {ev.event_type.replace(/_/g, " ")}
                              {ev.description ? `: ${ev.description}` : ""}
                            </span>
                            <span
                              className={
                                ev.event_type === "payment_failed"
                                  ? "font-medium text-red-700"
                                  : "text-[var(--color-text-primary)]"
                              }
                            >
                              {formatMoney(ev.amount_cents, ev.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {!stripeConfigured && !isPaid ? (
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
