"use client";

import { useCallback, useEffect, useState } from "react";

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
  business_id: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  pms_name: string | null;
  import_method: string | null;
};

export function RentalsAdminClient() {
  const [tab, setTab] = useState<"properties" | "partners" | "import">("properties");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pRes, partRes] = await Promise.all([
        fetch("/api/admin/rentals?kind=properties"),
        fetch("/api/admin/rentals?kind=partners"),
      ]);
      const pJson = await pRes.json();
      const partJson = await partRes.json();
      if (!pRes.ok) throw new Error(pJson.error || "Failed to load properties");
      if (!partRes.ok) throw new Error(partJson.error || "Failed to load partners");
      setProperties(pJson.items ?? []);
      setPartners(partJson.items ?? []);
      if (!partnerId && partJson.items?.[0]?.id) setPartnerId(partJson.items[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(true);
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

  async function runImport(previewOnly: boolean) {
    setBusy(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/rentals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          csv_text: csvText,
          preview_only: previewOnly,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setImportResult(JSON.stringify(json, null, 2));
      if (!previewOnly) await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
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
            ["import", "CSV import"],
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

      {tab === "properties" ? (
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
            <p className="mt-4 text-sm text-zinc-500">No properties yet. Import CSV or create in Directus.</p>
          ) : null}
        </div>
      ) : null}

      {tab === "partners" ? (
        <div className="space-y-3">
          {partners.map((p) => (
            <div key={p.id} className="border border-zinc-200 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900">{p.contact_name || p.id}</p>
                  <p className="text-zinc-600">
                    {p.contact_email} · {p.status} · {p.pms_name || "PMS n/a"}
                  </p>
                  <p className="text-xs text-zinc-400">business {p.business_id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["under_review", "approved", "active", "paused", "rejected"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus(p.id, s)}
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
            <p className="text-sm text-zinc-500">No partner applications yet.</p>
          ) : null}
        </div>
      ) : null}

      {tab === "import" ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Partner
            <select
              className="mt-1 w-full border border-zinc-200 px-3 py-2"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">Select partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.contact_name || p.contact_email || p.id} ({p.status})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            CSV
            <textarea
              className="mt-1 h-48 w-full border border-zinc-200 px-3 py-2 font-mono text-xs"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="external_id,title,property_type,bedrooms,bathrooms,sleeps,town_slug,booking_url,..."
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !partnerId || !csvText}
              onClick={() => void runImport(true)}
              className="bg-zinc-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Preview
            </button>
            <button
              type="button"
              disabled={busy || !partnerId || !csvText}
              onClick={() => void runImport(false)}
              className="bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Import
            </button>
          </div>
          {importResult ? (
            <pre className="overflow-x-auto bg-zinc-50 p-3 text-xs text-zinc-800">{importResult}</pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
