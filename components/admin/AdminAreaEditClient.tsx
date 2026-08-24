"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminAtAGlanceFields } from "@/components/admin/AdminAtAGlanceFields";
import { AdminPlaceMainImageControl } from "@/components/admin/AdminPlaceMainImageControl";
import {
  atAGlancePatchFromValues,
  atAGlanceValuesFromRow,
  EMPTY_ADMIN_AT_A_GLANCE,
  type AdminAtAGlanceValues,
} from "@/lib/admin/admin-at-a-glance-form";
import { AREA_TYPES, PLACE_STATUSES } from "@/lib/admin/place-constants";
import { includedOnHubBrowse } from "@/lib/places/hub-browse-visibility";

type TownOption = { id: string; title: string; slug: string };

type AreaRow = Record<string, unknown> & {
  id: string;
  title: string;
  slug: string;
  town_id: string | null;
  area_type: string | null;
  excerpt: string | null;
  content: string | null;
  seo_description: string | null;
  parking_notes: string | null;
  include_in_site_browse: boolean | null;
  status: string | null;
  map_lat: number | null;
  map_lng: number | null;
  main_image_url: string | null;
  hero_image_url?: string | null;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10";
const labelClass = "block text-sm font-medium text-zinc-700";

type Props = { areaId: string };

export function AdminAreaEditClient({ areaId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [area, setArea] = useState<AreaRow | null>(null);
  const [towns, setTowns] = useState<TownOption[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [townId, setTownId] = useState("");
  const [areaType, setAreaType] = useState<string>(AREA_TYPES[0]);
  const [status, setStatus] = useState("draft");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [parkingNotes, setParkingNotes] = useState("");
  const [includeBrowse, setIncludeBrowse] = useState(true);
  const [mapLat, setMapLat] = useState("");
  const [mapLng, setMapLng] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [atAGlance, setAtAGlance] = useState<AdminAtAGlanceValues>(EMPTY_ADMIN_AT_A_GLANCE);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/areas/${encodeURIComponent(areaId)}`)
      .then(async (res) => {
        const j = (await res.json()) as {
          area?: AreaRow;
          options?: { towns?: TownOption[] };
          error?: string;
        };
        if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load");
        const a = j.area!;
        setArea(a);
        setTowns(j.options?.towns ?? []);
        setTitle(String(a.title ?? ""));
        setSlug(String(a.slug ?? ""));
        setTownId(String(a.town_id ?? ""));
        setAreaType(String(a.area_type ?? AREA_TYPES[0]));
        setStatus(String(a.status ?? "draft"));
        setExcerpt(String(a.excerpt ?? ""));
        setContent(String(a.content ?? ""));
        setSeoDescription(String(a.seo_description ?? ""));
        setParkingNotes(String(a.parking_notes ?? ""));
        setIncludeBrowse(includedOnHubBrowse(a.include_in_site_browse));
        setMapLat(a.map_lat != null ? String(a.map_lat) : "");
        setMapLng(a.map_lng != null ? String(a.map_lng) : "");
        setMainImageUrl(a.main_image_url ?? a.hero_image_url ?? null);
        setAtAGlance(atAGlanceValuesFromRow(a));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [areaId]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch(`/api/admin/areas/${encodeURIComponent(areaId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          town_id: townId || null,
          area_type: areaType,
          status,
          excerpt,
          content,
          seo_description: seoDescription,
          parking_notes: parkingNotes,
          include_in_site_browse: includeBrowse,
          map_lat: mapLat.trim() ? Number(mapLat) : null,
          map_lng: mapLng.trim() ? Number(mapLng) : null,
          ...atAGlancePatchFromValues(atAGlance),
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setOk("Saved");
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading area…</p>;
  if (!area) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{err ?? "Area not found."}</p>
        <Link href="/admin/areas" className="text-sm font-medium text-zinc-600 underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-6">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Title
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className={labelClass}>
          Slug
          <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Town
          <select className={inputClass} value={townId} onChange={(e) => setTownId(e.target.value)}>
            <option value="">—</option>
            {towns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Area type
          <select className={inputClass} value={areaType} onChange={(e) => setAreaType(e.target.value)}>
            {AREA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Status
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          {PLACE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-3 text-sm text-zinc-800">
        <input
          type="checkbox"
          className="mt-1"
          checked={includeBrowse}
          onChange={(e) => setIncludeBrowse(e.target.checked)}
        />
        <span>
          Show on <code className="rounded bg-zinc-100 px-1 text-xs">/areas</code> hub
          <span className="mt-0.5 block text-xs text-zinc-500">
            Null or checked = linked on the public site. Only explicit off hides footer, sitemap, and
            area pages (Discover/search still work). Use off for outliers you only tie to
            businesses.
          </span>
        </span>
      </label>

      <label className={labelClass}>
        Excerpt
        <textarea className={inputClass} rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      </label>

      <label className={labelClass}>
        Content (markdown)
        <textarea className={inputClass} rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <label className={labelClass}>
        SEO description
        <input className={inputClass} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
      </label>

      <label className={labelClass}>
        Parking notes
        <textarea className={inputClass} rows={2} value={parkingNotes} onChange={(e) => setParkingNotes(e.target.value)} />
      </label>

      <AdminPlaceMainImageControl
        entity="area"
        entityId={areaId}
        currentImageUrl={mainImageUrl}
        onUpdated={(url) => setMainImageUrl(url)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Map lat
          <input className={inputClass} value={mapLat} onChange={(e) => setMapLat(e.target.value)} />
        </label>
        <label className={labelClass}>
          Map lng
          <input className={inputClass} value={mapLng} onChange={(e) => setMapLng(e.target.value)} />
        </label>
      </div>

      <AdminAtAGlanceFields values={atAGlance} onChange={setAtAGlance} placeLabel="area" />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save area"}
        </button>
        <Link href={`/area/${encodeURIComponent(slug)}`} className="text-sm font-medium text-zinc-600 underline">
          View public page
        </Link>
      </div>
    </form>
  );
}
