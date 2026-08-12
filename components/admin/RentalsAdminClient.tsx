"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  RENTAL_BEACH_ACCESS,
  RENTAL_PROPERTY_STATUSES,
  RENTAL_PROPERTY_TYPES,
} from "@/lib/stays/types";
import { slugifyRentalTitle } from "@/lib/stays/slug";

type PropertyRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  sleeps: number;
  content_rights_confirmed: boolean;
  last_sync_status: string | null;
  date_updated: string;
};

type PartnerRow = {
  id: string;
  business_id: string | null;
  display_name: string | null;
  show_public_business_profile: boolean;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  pms_name: string | null;
  import_method: string | null;
};

type TownOption = { id: string; label: string; sublabel?: string };

const field =
  "mt-1 w-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-700";

export function RentalsAdminClient() {
  const [tab, setTab] = useState<"properties" | "partners">("properties");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(true);
  const [showCreatePartner, setShowCreatePartner] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pRes, partRes, optRes] = await Promise.all([
        fetch("/api/admin/rentals?kind=properties"),
        fetch("/api/admin/rentals?kind=partners"),
        fetch("/api/admin/rentals?kind=options"),
      ]);
      const pJson = await pRes.json();
      const partJson = await partRes.json();
      const optJson = await optRes.json();
      if (!pRes.ok) throw new Error(pJson.error || "Failed to load properties");
      if (!partRes.ok) throw new Error(partJson.error || "Failed to load partners");
      if (!optRes.ok) throw new Error(optJson.error || "Failed to load options");
      const partnerItems = (partJson.items ?? []) as PartnerRow[];
      setProperties(pJson.items ?? []);
      setPartners(partnerItems);
      setTowns(optJson.towns ?? []);
      setSelectedPartnerId((prev) => {
        if (prev && partnerItems.some((p) => p.id === prev)) return prev;
        return partnerItems[0]?.id ?? "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setPartnerStatus(id: string, status: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/rentals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreatePartner(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      entity: "partner" as const,
      display_name: String(fd.get("display_name") ?? ""),
      contact_name: String(fd.get("contact_name") ?? ""),
      contact_email: String(fd.get("contact_email") ?? ""),
      contact_phone: String(fd.get("contact_phone") ?? "") || null,
      pms_name: String(fd.get("pms_name") ?? "") || null,
      booking_engine_base_url: String(fd.get("booking_engine_base_url") ?? ""),
      status: "active",
      show_public_business_profile: false,
    };
    try {
      const res = await fetch("/api/admin/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error || "Partner create failed");
      setNotice("Partner created — you can add a listing below.");
      setShowCreatePartner(false);
      e.currentTarget.reset();
      if (json.id) setSelectedPartnerId(json.id);
      await load();
      setTab("properties");
      setShowCreateListing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateListing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    const partnerId = String(fd.get("partner_id") ?? "");
    if (!partnerId) {
      setError("Create or select a partner first.");
      setBusy(false);
      return;
    }
    const title = String(fd.get("title") ?? "");
    const body = {
      entity: "property" as const,
      partner_id: partnerId,
      title,
      slug: String(fd.get("slug") ?? "") || slugifyRentalTitle(title),
      description: String(fd.get("description") ?? "") || null,
      property_type: String(fd.get("property_type") ?? "house"),
      status: String(fd.get("status") ?? "draft"),
      town_id: String(fd.get("town_id") ?? "") || null,
      bedrooms: Number(fd.get("bedrooms") ?? 1),
      bathrooms: Number(fd.get("bathrooms") ?? 1),
      sleeps: Number(fd.get("sleeps") ?? 2),
      booking_url: String(fd.get("booking_url") ?? ""),
      hero_image_url: String(fd.get("hero_image_url") ?? ""),
      starting_nightly_rate: fd.get("starting_nightly_rate")
        ? Number(fd.get("starting_nightly_rate"))
        : null,
      beach_access: String(fd.get("beach_access") ?? "unknown") || null,
      pets_allowed: fd.get("pets_allowed") === "on",
      private_pool: fd.get("private_pool") === "on",
      gulf_front: fd.get("gulf_front") === "on",
      gulf_view: fd.get("gulf_view") === "on",
      golf_cart_included: fd.get("golf_cart_included") === "on",
      content_rights_confirmed: fd.get("content_rights_confirmed") === "on",
      featured: fd.get("featured") === "on",
    };
    try {
      const res = await fetch("/api/admin/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error || "Listing create failed");
      setNotice(`Listing created${body.status === "published" ? " and published" : " as draft"}.`);
      e.currentTarget.reset();
      setSlug("");
      setSlugTouched(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Listing create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["properties", "Properties"],
            ["partners", "Partners"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm font-medium ${
              tab === id ? "bg-teal-800 text-white" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-teal-800">{notice}</p> : null}

      {tab === "properties" ? (
        <div className="space-y-8">
          <section className="border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-headline text-lg font-semibold text-zinc-900">Add listing</h2>
              <button
                type="button"
                className="text-sm text-teal-900 underline"
                onClick={() => setShowCreateListing((v) => !v)}
              >
                {showCreateListing ? "Hide" : "Show"}
              </button>
            </div>

            {partners.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">
                No partners yet.{" "}
                <button
                  type="button"
                  className="font-medium text-teal-900 underline"
                  onClick={() => {
                    setTab("partners");
                    setShowCreatePartner(true);
                  }}
                >
                  Create a partner
                </button>{" "}
                first, then add the stay.
              </p>
            ) : null}

            {showCreateListing && partners.length > 0 ? (
              <form onSubmit={onCreateListing} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-zinc-800 sm:col-span-2">
                    Partner
                    <select
                      name="partner_id"
                      required
                      className={field}
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                    >
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name || p.contact_name || p.id} ({p.status})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-zinc-800">
                    Title
                    <input
                      name="title"
                      required
                      className={field}
                      onChange={(e) => {
                        if (!slugTouched) setSlug(slugifyRentalTitle(e.target.value));
                      }}
                    />
                  </label>
                  <label className="block text-sm font-medium text-zinc-800">
                    Slug
                    <input
                      name="slug"
                      required
                      className={field}
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(e.target.value);
                      }}
                    />
                  </label>
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
                    Status
                    <select name="status" className={field} defaultValue="draft">
                      {RENTAL_PROPERTY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-zinc-800">
                    Town
                    <select name="town_id" className={field} defaultValue="">
                      <option value="">Select town…</option>
                      {towns.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-zinc-800">
                    Starting nightly rate
                    <input
                      name="starting_nightly_rate"
                      type="number"
                      min={0}
                      step="1"
                      className={field}
                    />
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
                    <input
                      name="sleeps"
                      type="number"
                      min={1}
                      defaultValue={6}
                      required
                      className={field}
                    />
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
                </div>

                <label className="block text-sm font-medium text-zinc-800">
                  Description
                  <textarea name="description" rows={5} className={field} />
                </label>
                <label className="block text-sm font-medium text-zinc-800">
                  Booking URL (partner engine)
                  <input
                    name="booking_url"
                    type="url"
                    className={field}
                    placeholder="https://…"
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-800">
                  Hero image URL
                  <input
                    name="hero_image_url"
                    type="url"
                    className={field}
                    placeholder="https://…"
                  />
                </label>

                <div className="flex flex-wrap gap-4 text-sm text-zinc-800">
                  {(
                    [
                      ["pets_allowed", "Pets allowed"],
                      ["private_pool", "Private pool"],
                      ["gulf_front", "Gulf front"],
                      ["gulf_view", "Gulf view"],
                      ["golf_cart_included", "Golf cart"],
                      ["featured", "Featured"],
                      ["content_rights_confirmed", "Content rights confirmed"],
                    ] as const
                  ).map(([name, label]) => (
                    <label key={name} className="inline-flex items-center gap-2">
                      <input name={name} type="checkbox" />
                      {label}
                    </label>
                  ))}
                </div>

                <p className="text-xs text-zinc-500">
                  Published stays need an active partner, town, booking URL, image, rights
                  confirmation, and enough description text to appear in search/SEO.
                </p>

                <button
                  type="submit"
                  disabled={busy}
                  className="bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Create listing"}
                </button>
              </form>
            ) : null}
          </section>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-500">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Beds</th>
                  <th className="py-2 pr-4">Rights</th>
                  <th className="py-2 pr-4">Sync</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">
                      <a
                        href={`/stays/${p.slug}`}
                        className="font-medium text-teal-900 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {p.title}
                      </a>
                    </td>
                    <td className="py-2 pr-4">{p.status}</td>
                    <td className="py-2 pr-4">
                      {p.bedrooms}/{p.bathrooms}/{p.sleeps}
                    </td>
                    <td className="py-2 pr-4">{p.content_rights_confirmed ? "yes" : "no"}</td>
                    <td className="py-2 pr-4">{p.last_sync_status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {properties.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No properties yet — use Add listing above.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "partners" ? (
        <div className="space-y-6">
          <section className="border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-headline text-lg font-semibold text-zinc-900">Add partner</h2>
              <button
                type="button"
                className="text-sm text-teal-900 underline"
                onClick={() => setShowCreatePartner((v) => !v)}
              >
                {showCreatePartner ? "Hide" : "Show"}
              </button>
            </div>
            {showCreatePartner ? (
              <form onSubmit={onCreatePartner} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-800 sm:col-span-2">
                  Company / brand name
                  <input name="display_name" required className={field} />
                </label>
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
                <label className="block text-sm font-medium text-zinc-800">
                  PMS
                  <input name="pms_name" className={field} />
                </label>
                <label className="block text-sm font-medium text-zinc-800 sm:col-span-2">
                  Booking engine base URL
                  <input name="booking_engine_base_url" type="url" className={field} />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Create partner"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          <div className="space-y-3">
            {partners.map((p) => (
              <div key={p.id} className="border border-zinc-200 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {p.display_name || p.contact_name || p.id}
                    </p>
                    <p className="text-zinc-600">
                      {p.contact_email} · {p.status} · {p.pms_name || "PMS n/a"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {p.business_id
                        ? `business ${p.business_id}${p.show_public_business_profile ? " · public profile" : ""}`
                        : "no public business link"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["under_review", "approved", "active", "paused", "rejected"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => void setPartnerStatus(p.id, s)}
                        className="border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {partners.length === 0 ? (
              <p className="text-sm text-zinc-500">No partners yet — use Add partner above.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
