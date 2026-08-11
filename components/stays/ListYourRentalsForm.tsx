"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { captureEvent } from "@/lib/analytics/gtag-runner";

const field =
  "mt-1 w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-700";

export function ListYourRentalsForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      _hp_company_website: String(fd.get("_hp_company_website") ?? ""),
      business_id: String(fd.get("business_id") ?? "") || null,
      business_slug: String(fd.get("business_slug") ?? "") || null,
      business_title: String(fd.get("business_title") ?? ""),
      contact_name: String(fd.get("contact_name") ?? ""),
      contact_email: String(fd.get("contact_email") ?? ""),
      contact_phone: String(fd.get("contact_phone") ?? ""),
      pms_name: String(fd.get("pms_name") ?? "") || null,
      pms_other: String(fd.get("pms_other") ?? "") || null,
      booking_engine_base_url: String(fd.get("booking_engine_base_url") ?? ""),
      booking_url_template: String(fd.get("booking_url_template") ?? "") || null,
      portfolio_size: fd.get("portfolio_size") ? Number(fd.get("portfolio_size")) : null,
      towns_served: String(fd.get("towns_served") ?? "") || null,
      import_method: String(fd.get("import_method") ?? "manual"),
      authority_attested: fd.get("authority_attested") === "on",
      content_rights_attested: fd.get("content_rights_attested") === "on",
      notes: String(fd.get("notes") ?? "") || null,
    };

    captureEvent("rental_partner_application_started", { step: "submit" });

    try {
      const res = await fetch("/api/rentals/partner-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Submission failed");
      captureEvent("rental_partner_application_submitted", {
        business_id: body.business_id || undefined,
        import_method: body.import_method,
        pms_name: body.pms_name || undefined,
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
        <h2 className="font-headline text-lg font-semibold text-teal-950">Application received</h2>
        <p className="mt-2">
          Thanks — we&apos;ll review your rental partner application. Owner Verified status on your
          business profile is separate from marketplace approval.
        </p>
        <p className="mt-3">
          Need to claim or update your business first?{" "}
          <Link href="/list-your-business" className="font-medium text-teal-900 underline">
            List your business
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* honeypot */}
      <input
        type="text"
        name="_hp_company_website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <div>
        <label className="block text-sm font-medium text-zinc-800">
          Property management company name
          <input name="business_title" required className={field} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-800">
          Existing business slug (optional)
          <input
            name="business_slug"
            className={field}
            placeholder="your-company-slug"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Existing business ID (optional)
          <input name="business_id" className={field} placeholder="uuid" />
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        Prefer linking an existing listing. Find or add one via{" "}
        <Link href="/list-your-business" className="underline">
          List your business
        </Link>
        . No account is required to apply.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-zinc-800">
          Contact name
          <input name="contact_name" required className={field} />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Contact email
          <input name="contact_email" type="email" required className={field} />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Phone
          <input name="contact_phone" className={field} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-800">
          PMS / booking system
          <input name="pms_name" className={field} placeholder="e.g. Streamline, Escapia" />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Other system
          <input name="pms_other" className={field} />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-800">
        Booking engine base URL
        <input name="booking_engine_base_url" className={field} placeholder="https://…" />
      </label>
      <label className="block text-sm font-medium text-zinc-800">
        Booking URL template (optional)
        <input
          name="booking_url_template"
          className={field}
          placeholder="https://…?arrive={check_in}&depart={check_out}&guests={guests}"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-800">
          Approx. portfolio size
          <input name="portfolio_size" type="number" min={1} className={field} />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          How will inventory be managed?
          <select name="import_method" className={field} defaultValue="manual">
            <option value="manual">Manual entry with WhereTo30A</option>
            <option value="ical">iCal availability later</option>
            <option value="api">API / PMS (future)</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-800">
        Towns / communities served
        <input name="towns_served" className={field} placeholder="Seaside, WaterColor, …" />
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        Notes
        <textarea name="notes" rows={3} className={field} />
      </label>

      <label className="flex items-start gap-2 text-sm text-zinc-800">
        <input name="authority_attested" type="checkbox" required className="mt-1" />
        I confirm I have authority to list these vacation rental properties.
      </label>
      <label className="flex items-start gap-2 text-sm text-zinc-800">
        <input name="content_rights_attested" type="checkbox" required className="mt-1" />
        I confirm rights to use the photos and descriptions provided for WhereTo30A listings.
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit partner application"}
      </button>
    </form>
  );
}
