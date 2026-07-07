"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { summarizeBusinessHours } from "@/lib/business/format-business-hours";
import type { PlanEntitlements } from "@/lib/portal/entitlements";
import { PlanGate } from "@/components/portal/PlanGate";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";

type BusinessRow = {
  id: string;
  title: string;
  slug: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  excerpt: string | null;
  content: string | null;
  hours: unknown;
  social_links: { instagram?: string; facebook?: string } | null;
  service_area: string | null;
};

type Props = {
  businessId: string;
};

function hoursToText(hours: unknown): string {
  const summarized = summarizeBusinessHours(hours);
  if (summarized) return summarized;
  if (hours == null) return "";
  if (typeof hours === "string") return hours;
  try {
    return JSON.stringify(hours, null, 2);
  } catch {
    return "";
  }
}

export function PortalBusinessEditForm({ businessId }: Props) {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [hasPendingEdit, setHasPendingEdit] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/portal/businesses/${encodeURIComponent(businessId)}`)
      .then(async (res) => {
        const j = (await res.json()) as {
          business?: BusinessRow;
          entitlements?: PlanEntitlements;
          pending_edit?: { id: string } | null;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setBusiness(j.business ?? null);
        setEntitlements(j.entitlements ?? null);
        setHasPendingEdit(Boolean(j.pending_edit));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!business || !entitlements) return;
    setPending(true);
    setErr(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      title: String(fd.get("title") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      website: String(fd.get("website") ?? ""),
      address: String(fd.get("address") ?? ""),
      excerpt: String(fd.get("excerpt") ?? ""),
      service_area: String(fd.get("service_area") ?? ""),
    };

    if (entitlements.long_description) {
      payload.content = String(fd.get("content") ?? "");
    }

    if (entitlements.hours) {
      const hoursText = String(fd.get("hours") ?? "").trim();
      payload.hours = hoursText || null;
    }

    if (entitlements.social_links) {
      payload.social_links = {
        instagram: String(fd.get("instagram") ?? "").trim() || undefined,
        facebook: String(fd.get("facebook") ?? "").trim() || undefined,
      };
    }

    const res = await fetch(`/api/portal/businesses/${encodeURIComponent(businessId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as { error?: string };
    setPending(false);

    if (!res.ok) {
      setErr(j.error ?? "Something went wrong.");
      return;
    }

    setSuccess(true);
    setHasPendingEdit(true);
    load();
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading listing…</p>;
  }

  if (!business || !entitlements) {
    return <p className="text-sm text-red-600">{err ?? "Listing not found."}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/portal"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
        >
          ← Dashboard
        </Link>
        <Link
          href={`/portal/businesses/${encodeURIComponent(businessId)}/photos`}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Manage photos
        </Link>
      </div>

      <h1 className="font-headline mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">
        Edit {business.title}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Changes are reviewed before they go live on your public listing.
      </p>

      {hasPendingEdit ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You have edits under review. We&apos;ll email you when they&apos;re approved.
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-8 space-y-6">
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {success ? (
          <p className="text-sm text-green-700">Edits submitted for review.</p>
        ) : null}

        <div>
          <label className={labelClass} htmlFor="edit-title">
            Business name
          </label>
          <input
            id="edit-title"
            name="title"
            defaultValue={business.title}
            required
            disabled={hasPendingEdit}
            className={`${inputClass} mt-1`}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="edit-phone">
              Phone
            </label>
            <input
              id="edit-phone"
              name="phone"
              defaultValue={business.phone ?? ""}
              disabled={hasPendingEdit}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-email">
              Email
            </label>
            <input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={business.email ?? ""}
              disabled={hasPendingEdit}
              className={`${inputClass} mt-1`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-website">
            Website
          </label>
          <input
            id="edit-website"
            name="website"
            type="url"
            defaultValue={business.website ?? ""}
            disabled={hasPendingEdit}
            className={`${inputClass} mt-1`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-address">
            Address
          </label>
          <input
            id="edit-address"
            name="address"
            defaultValue={business.address ?? ""}
            disabled={hasPendingEdit}
            className={`${inputClass} mt-1`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-excerpt">
            Short description
          </label>
          <textarea
            id="edit-excerpt"
            name="excerpt"
            rows={3}
            maxLength={500}
            defaultValue={business.excerpt ?? ""}
            disabled={hasPendingEdit}
            className={`${inputClass} mt-1`}
          />
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Up to 500 characters.</p>
        </div>

        <PlanGate allowed={entitlements.long_description} feature="Full description" businessId={businessId}>
          <div>
            <label className={labelClass} htmlFor="edit-content">
              Full description
            </label>
            <textarea
              id="edit-content"
              name="content"
              rows={6}
              defaultValue={business.content ?? ""}
              disabled={hasPendingEdit || !entitlements.long_description}
              className={`${inputClass} mt-1`}
            />
          </div>
        </PlanGate>

        <div>
          <label className={labelClass} htmlFor="edit-service-area">
            Service area
          </label>
          <input
            id="edit-service-area"
            name="service_area"
            defaultValue={business.service_area ?? ""}
            disabled={hasPendingEdit}
            className={`${inputClass} mt-1`}
          />
        </div>

        <PlanGate allowed={entitlements.hours} feature="Hours" businessId={businessId}>
          <div>
            <label className={labelClass} htmlFor="edit-hours">
              Hours
            </label>
            <textarea
              id="edit-hours"
              name="hours"
              rows={4}
              defaultValue={hoursToText(business.hours)}
              disabled={hasPendingEdit || !entitlements.hours}
              placeholder="Mon–Fri 9am–5pm, Sat 10am–2pm"
              className={`${inputClass} mt-1`}
            />
          </div>
        </PlanGate>

        <PlanGate allowed={entitlements.social_links} feature="Social links" businessId={businessId}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="edit-instagram">
                Instagram
              </label>
              <input
                id="edit-instagram"
                name="instagram"
                defaultValue={business.social_links?.instagram ?? ""}
                disabled={hasPendingEdit || !entitlements.social_links}
                placeholder="https://instagram.com/..."
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit-facebook">
                Facebook
              </label>
              <input
                id="edit-facebook"
                name="facebook"
                defaultValue={business.social_links?.facebook ?? ""}
                disabled={hasPendingEdit || !entitlements.social_links}
                placeholder="https://facebook.com/..."
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>
        </PlanGate>

        <button
          type="submit"
          disabled={pending || hasPendingEdit}
          className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
