"use client";

import { useCallback, useEffect, useState } from "react";
import { planDisplayName } from "@/lib/portal/entitlements";

type SubscriptionItem = {
  business_id: string;
  plan_slug: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  comped_by: string | null;
  updated_at: string;
  businesses: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

const COMP_PLANS = [
  { value: "local_partner", label: "Local Partner" },
  { value: "premium_partner", label: "Premium Partner" },
  { value: "signature_partner", label: "Signature Partner" },
] as const;

export function AdminSubscriptionsClient() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [compPlan, setCompPlan] = useState<Record<string, string>>({});
  const [transferEmail, setTransferEmail] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/subscriptions")
      .then(async (res) => {
        const j = (await res.json()) as { items?: SubscriptionItem[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setItems(j.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(businessId: string, action: string, planSlug?: string) {
    setActing(businessId);
    setError(null);
    const res = await fetch(`/api/admin/subscriptions/${encodeURIComponent(businessId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, plan_slug: planSlug }),
    });
    const j = (await res.json()) as { error?: string };
    setActing(null);
    if (!res.ok) {
      setError(j.error ?? "Action failed");
      return;
    }
    load();
  }

  async function transferOwner(businessId: string) {
    const email = (transferEmail[businessId] ?? "").trim();
    if (!email) {
      setError("Enter the new owner's email.");
      return;
    }
    setActing(businessId);
    setError(null);
    const res = await fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}/owner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = (await res.json()) as { error?: string };
    setActing(null);
    if (!res.ok) {
      setError(j.error ?? "Transfer failed");
      return;
    }
    setTransferEmail((prev) => ({ ...prev, [businessId]: "" }));
    load();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading subscriptions…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">{items.length} subscription rows (latest 200)</p>

      {items.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          No subscription rows yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const bizRaw = item.businesses;
            const biz = Array.isArray(bizRaw) ? bizRaw[0] : bizRaw;
            const title = biz?.title ?? item.business_id;
            const selectedPlan = compPlan[item.business_id] ?? "local_partner";

            return (
              <li key={item.business_id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{title}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {planDisplayName(item.plan_slug)} · {item.status}
                    </p>
                    {item.current_period_end ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Period end {new Date(item.current_period_end).toLocaleString()}
                      </p>
                    ) : null}
                    {item.stripe_subscription_id ? (
                      <p className="mt-1 font-mono text-xs text-zinc-400">{item.stripe_subscription_id}</p>
                    ) : null}
                  </div>
                  {biz?.slug ? (
                    <a
                      href={`/business/${encodeURIComponent(biz.slug)}`}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View listing
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-2">
                  {item.status !== "comped" || !item.plan_slug.includes("partner") ? (
                    <>
                      <select
                        value={selectedPlan}
                        onChange={(e) =>
                          setCompPlan((prev) => ({ ...prev, [item.business_id]: e.target.value }))
                        }
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      >
                        {COMP_PLANS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={acting === item.business_id}
                        onClick={() => act(item.business_id, "comp", selectedPlan)}
                        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Comp plan
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={acting === item.business_id}
                      onClick={() => act(item.business_id, "remove_comp")}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      Remove comp
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={acting === item.business_id}
                    onClick={() => act(item.business_id, "downgrade")}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                  >
                    Downgrade to free
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4">
                  <input
                    type="email"
                    value={transferEmail[item.business_id] ?? ""}
                    onChange={(e) =>
                      setTransferEmail((prev) => ({ ...prev, [item.business_id]: e.target.value }))
                    }
                    placeholder="New owner email"
                    className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={acting === item.business_id}
                    onClick={() => transferOwner(item.business_id)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Transfer owner
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
