"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { captureEvent } from "@/lib/analytics/gtag-runner";
import { RENTAL_BEACH_ACCESS, RENTAL_PROPERTY_TYPES } from "@/lib/stays/types";

const field =
  "mt-1 w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-700";

type TownOption = { id: string; label: string; sublabel?: string };

export function ListARentalForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [towns, setTowns] = useState<TownOption[]>([]);

  useEffect(() => {
    void fetch("/api/rentals/form-options")
      .then((r) => r.json())
      .then((j: { towns?: TownOption[] }) => setTowns(j.towns ?? []))
      .catch(() => setTowns([]));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      _hp_company_website: String(fd.get("_hp_company_website") ?? ""),
      display_name: String(fd.get("display_name") ?? ""),
      contact_name: String(fd.get("contact_name") ?? ""),
      contact_email: String(fd.get("contact_email") ?? ""),
      contact_phone: String(fd.get("contact_phone") ?? ""),
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      property_type: String(fd.get("property_type") ?? "house"),
      town_id: String(fd.get("town_id") ?? ""),
      bedrooms: Number(fd.get("bedrooms") ?? 1),
      bathrooms: Number(fd.get("bathrooms") ?? 1),
      sleeps: Number(fd.get("sleeps") ?? 2),
      booking_url: String(fd.get("booking_url") ?? ""),
      hero_image_url: String(fd.get("hero_image_url") ?? "") || null,
      starting_nightly_rate: fd.get("starting_nightly_rate")
        ? Number(fd.get("starting_nightly_rate"))
        : null,
      beach_access: String(fd.get("beach_access") ?? "unknown"),
      pets_allowed: fd.get("pets_allowed") === "on",
      private_pool: fd.get("private_pool") === "on",
      gulf_front: fd.get("gulf_front") === "on",
      gulf_view: fd.get("gulf_view") === "on",
      golf_cart_included: fd.get("golf_cart_included") === "on",
      authority_attested: fd.get("authority_attested") === "on",
      content_rights_attested: fd.get("content_rights_attested") === "on",
      notes: String(fd.get("notes") ?? "") || null,
    };

    captureEvent("rental_listing_started", { step: "submit" });

    try {
      const res = await fetch("/api/rentals/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Submission failed");
      captureEvent("rental_listing_submitted", {
        property_type: body.property_type,
        town_id: body.town_id,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="border border-teal-200 bg-teal-50/60 p-6 text-sm text-zinc-800">
        <h2 className="font-headline text-lg font-semibold text-teal-950">Listing submitted</h2>
        <p className="mt-2">
          Thanks — we&apos;ll review your vacation rental and publish it when it&apos;s ready.
          Guests will check availability on your booking site; you keep the reservation.
        </p>
        <p className="mt-3">
          <Link href="/stays" className="font-medium text-teal-900 underline">
            Browse stays
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input
        type="text"
        name="_hp_company_website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <fieldset className="space-y-4">
        <legend className="font-headline text-lg font-semibold text-zinc-900">Your contact</legend>
        <label className="block text-sm font-medium text-zinc-800">
          Company or brand name
          <input name="display_name" required className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-zinc-800">
            Your name
            <input name="contact_name" required className={field} />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Email
            <input name="contact_email" type="email" required className={field} />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Phone
            <input name="contact_phone" className={field} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-headline text-lg font-semibold text-zinc-900">The stay</legend>
        <label className="block text-sm font-medium text-zinc-800">
          Listing title
          <input
            name="title"
            required
            className={field}
            placeholder="e.g. Gulf-view cottage near Seaside"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Description
          <textarea
            name="description"
            required
            rows={6}
            minLength={40}
            className={field}
            placeholder="What makes this stay special? Location, layout, and guest experience…"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-800">
            Property type
            <select name="property_type" className={field} defaultValue="house">
              {RENTAL_PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Town
            <select name="town_id" required className={field} defaultValue="">
              <option value="" disabled>
                Select town…
              </option>
              {towns.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Bedrooms
            <input
              name="bedrooms"
              type="number"
              min={0}
              step="0.5"
              defaultValue={3}
              required
              className={field}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Bathrooms
            <input
              name="bathrooms"
              type="number"
              min={0}
              step="0.5"
              defaultValue={2}
              required
              className={field}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Sleeps
            <input name="sleeps" type="number" min={1} defaultValue={6} required className={field} />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Beach access
            <select name="beach_access" className={field} defaultValue="unknown">
              {RENTAL_BEACH_ACCESS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            Starting nightly rate (optional)
            <input name="starting_nightly_rate" type="number" min={0} className={field} />
          </label>
        </div>

        <label className="block text-sm font-medium text-zinc-800">
          Booking URL
          <input
            name="booking_url"
            type="url"
            required
            className={field}
            placeholder="https://your-booking-site.com/…"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Guests leave WhereTo30A to check availability on your site.
          </span>
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Hero image URL (optional)
          <input name="hero_image_url" type="url" className={field} placeholder="https://…" />
        </label>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-800">
          {(
            [
              ["pets_allowed", "Pets allowed"],
              ["private_pool", "Private pool"],
              ["gulf_front", "Gulf front"],
              ["gulf_view", "Gulf view"],
              ["golf_cart_included", "Golf cart included"],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="inline-flex items-center gap-2">
              <input name={name} type="checkbox" />
              {label}
            </label>
          ))}
        </div>

        <label className="block text-sm font-medium text-zinc-800">
          Notes for our team (optional)
          <textarea name="notes" rows={2} className={field} />
        </label>
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-zinc-800">
        <input name="authority_attested" type="checkbox" required className="mt-1" />
        I confirm I have authority to list this vacation rental.
      </label>
      <label className="flex items-start gap-2 text-sm text-zinc-800">
        <input name="content_rights_attested" type="checkbox" required className="mt-1" />
        I confirm rights to use the photos and descriptions provided.
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit listing for review"}
      </button>

      <p className="text-xs text-zinc-500">
        Prefer a company partnership application without a specific home?{" "}
        <Link href="/list-your-rentals/partner" className="underline">
          Partner application
        </Link>
        .
      </p>
    </form>
  );
}
