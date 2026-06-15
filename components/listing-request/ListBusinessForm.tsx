"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { discoveryHref } from "@/lib/nav/discovery-links";
import { captureEvent } from "@/lib/analytics/gtag-runner";

export type ListBusinessTownOption = { id: string; title: string; slug: string };

type SimilarHit = { id: string; title: string; slug: string; similarity: number };

type Props = {
  towns: ListBusinessTownOption[];
};

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";

export function ListBusinessForm({ towns }: Props) {
  const featureFlags = useAppFeatureFlags();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarHit[] | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    setErr(null);
    setSimilar(null);

    const fd = new FormData(e.currentTarget);
    const latRaw = String(fd.get("map_lat") ?? "").trim();
    const lngRaw = String(fd.get("map_lng") ?? "").trim();
    const map_lat = latRaw === "" ? undefined : Number(latRaw);
    const map_lng = lngRaw === "" ? undefined : Number(lngRaw);

    const payload = {
      _hp_company_website: String(fd.get("_hp_company_website") ?? ""),
      submitter_name: String(fd.get("submitter_name") ?? ""),
      submitter_email: String(fd.get("submitter_email") ?? ""),
      submitter_phone: String(fd.get("submitter_phone") ?? ""),
      title: String(fd.get("title") ?? ""),
      town_id: String(fd.get("town_id") ?? ""),
      address: String(fd.get("address") ?? ""),
      website: String(fd.get("website") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("business_email") ?? ""),
      description: String(fd.get("description") ?? ""),
      is_storefront: fd.get("is_storefront") === "on",
      is_service_business: fd.get("is_service_business") === "on",
      service_area: String(fd.get("service_area") ?? ""),
      map_lat: map_lat != null && Number.isFinite(map_lat) ? map_lat : null,
      map_lng: map_lng != null && Number.isFinite(map_lng) ? map_lng : null,
    };

    const res = await fetch("/api/listing-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      similar?: SimilarHit[];
    };
    setPending(false);

    if (!res.ok) {
      if (j.fieldErrors) {
        const first = Object.values(j.fieldErrors).flat()[0];
        setErr(first ?? j.error ?? "Something went wrong.");
      } else {
        setErr(j.error ?? "Something went wrong.");
      }
      return;
    }

    if (j.ok) {
      setDone(true);
      captureEvent("listing_request_submitted", { business_title: payload.title, town_id: payload.town_id });
      setMsg(
        "Thanks — we received your request. Our team reviews submissions before anything goes live. If we already list a close match, we may reach out or link you to claim it instead of creating a duplicate.",
      );
      setSimilar(j.similar && j.similar.length > 0 ? j.similar : null);
      e.currentTarget.reset();
    }
  }

  if (done && msg) {
    return (
      <div className="mt-10 space-y-6">
        <div
          className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 shadow-sm"
          role="status"
        >
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{msg}</p>
        </div>
        {similar && similar.length > 0 ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
            <h2 className="font-headline text-sm font-semibold text-[var(--color-text-primary)]">
              Possible matches already on WhereTo30A
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              If one of these is your business, mention it when we follow up — or{" "}
              <Link href={discoveryHref(featureFlags)} className="font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline">
                {featureFlags.ask ? "open Ask" : "open search"}
              </Link>{" "}
              to find the listing.
            </p>
            <ul className="mt-4 space-y-2">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/business/${s.slug}`}
                    className="text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
                  >
                    {s.title}
                  </Link>
                  <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">
                    ({Math.round(s.similarity * 100)}% name match)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
          onClick={() => {
            setDone(false);
            setMsg(null);
            setSimilar(null);
          }}
        >
          Submit another business
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-6">
      <p className="-mt-2 text-sm text-[var(--color-text-secondary)]">
        Requests are emailed to our team for review. Nothing appears on the public site until editorial staff publish the
        listing after approval.
      </p>

      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="_hp_company_website">Company website</label>
        <input id="_hp_company_website" name="_hp_company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="submitter_name">
            Your name
          </label>
          <input id="submitter_name" name="submitter_name" required className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <label className={labelClass} htmlFor="submitter_email">
            Your email
          </label>
          <input
            id="submitter_email"
            name="submitter_email"
            type="email"
            required
            autoComplete="email"
            className={`${inputClass} mt-1.5`}
          />
        </div>
      </div>

      <div className="sm:max-w-md">
        <label className={labelClass} htmlFor="submitter_phone">
          Your phone <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
        </label>
        <input
          id="submitter_phone"
          name="submitter_phone"
          type="tel"
          autoComplete="tel"
          className={`${inputClass} mt-1.5`}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="title">
          Business or service name
        </label>
        <input id="title" name="title" required className={`${inputClass} mt-1.5`} />
      </div>

      <div className="sm:max-w-md">
        <label className={labelClass} htmlFor="town_id">
          Primary town
        </label>
        <select id="town_id" name="town_id" required className={`${inputClass} mt-1.5`} defaultValue="">
          <option value="" disabled>
            Choose a town
          </option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4">
        <legend className={`${labelClass} px-1`}>How do you operate?</legend>
        <p className="text-xs text-[var(--color-text-tertiary)]">Select all that apply.</p>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            name="is_storefront"
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>We have a storefront or fixed public location customers visit.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            name="is_service_business"
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>We are primarily mobile, by appointment, or serve a wider area (contractors, pros, delivery, etc.).</span>
        </label>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="address">
          Street address <span className="font-normal text-[var(--color-text-tertiary)]">(if storefront)</span>
        </label>
        <input name="address" id="address" className={`${inputClass} mt-1.5`} placeholder="Street, city" />
      </div>

      <div>
        <label className={labelClass} htmlFor="service_area">
          Service area <span className="font-normal text-[var(--color-text-tertiary)]">(if mobile / regional)</span>
        </label>
        <input
          name="service_area"
          id="service_area"
          className={`${inputClass} mt-1.5`}
          placeholder="e.g. Scenic 30A, Walton & Bay counties"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="website">
            Website <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
          </label>
          <input
            name="website"
            id="website"
            type="url"
            inputMode="url"
            placeholder="https://"
            className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Business phone <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
          </label>
          <input name="phone" id="phone" type="tel" className={`${inputClass} mt-1.5`} />
        </div>
      </div>

      <div className="sm:max-w-md">
        <label className={labelClass} htmlFor="business_email">
          Business email <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
        </label>
        <input name="business_email" id="business_email" type="email" className={`${inputClass} mt-1.5`} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="map_lat">
            Latitude <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
          </label>
          <input name="map_lat" id="map_lat" inputMode="decimal" className={`${inputClass} mt-1.5`} placeholder="30.32" />
        </div>
        <div>
          <label className={labelClass} htmlFor="map_lng">
            Longitude <span className="font-normal text-[var(--color-text-tertiary)]">(optional)</span>
          </label>
          <input name="map_lng" id="map_lng" inputMode="decimal" className={`${inputClass} mt-1.5`} placeholder="-86.13" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Tell us about this listing
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          minLength={15}
          placeholder="What you offer, hours, neighborhood, or anything that helps us verify and describe it."
          className={`${inputClass} mt-1.5`}
        />
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">At least 15 characters.</p>
      </div>

      {err ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {err}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
      >
        {pending ? "Sending…" : "Submit listing request"}
      </button>
    </form>
  );
}
