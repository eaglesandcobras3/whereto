"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";

type Props = {
  towns: ListBusinessTownOption[];
};

export function PortalNewBusinessForm({ towns }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const latRaw = String(fd.get("map_lat") ?? "").trim();
    const lngRaw = String(fd.get("map_lng") ?? "").trim();
    const map_lat = latRaw === "" ? null : Number(latRaw);
    const map_lng = lngRaw === "" ? null : Number(lngRaw);

    const payload = {
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

    const res = await fetch("/api/portal/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as { error?: string; fieldErrors?: Record<string, string[] | undefined> };
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

    router.push("/portal");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-6">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div>
        <label className={labelClass} htmlFor="portal-title">
          Business name
        </label>
        <input id="portal-title" name="title" required className={`${inputClass} mt-1`} />
      </div>

      <div>
        <label className={labelClass} htmlFor="portal-town">
          Primary town
        </label>
        <select id="portal-town" name="town_id" required className={`${inputClass} mt-1`}>
          <option value="">Select a town</option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelClass}>How do you operate?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_storefront" className="rounded" />
          Storefront or fixed location
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_service_business" className="rounded" />
          Mobile or regional service
        </label>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="portal-address">
          Address (optional)
        </label>
        <input id="portal-address" name="address" className={`${inputClass} mt-1`} />
      </div>

      <div>
        <label className={labelClass} htmlFor="portal-service-area">
          Service area (optional)
        </label>
        <input id="portal-service-area" name="service_area" className={`${inputClass} mt-1`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="portal-phone">
            Business phone
          </label>
          <input id="portal-phone" name="phone" type="tel" className={`${inputClass} mt-1`} />
        </div>
        <div>
          <label className={labelClass} htmlFor="portal-email">
            Business email
          </label>
          <input id="portal-email" name="business_email" type="email" className={`${inputClass} mt-1`} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="portal-website">
          Website
        </label>
        <input id="portal-website" name="website" type="url" placeholder="https://" className={`${inputClass} mt-1`} />
      </div>

      <div>
        <label className={labelClass} htmlFor="portal-description">
          Description
        </label>
        <textarea
          id="portal-description"
          name="description"
          required
          minLength={15}
          rows={5}
          className={`${inputClass} mt-1`}
          placeholder="What you offer, hours, neighborhood, or anything that helps us verify and describe it."
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
