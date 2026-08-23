"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PLACE_STATUSES } from "@/lib/admin/admin-towns";

type TownRow = Record<string, unknown> & {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: string | null;
  map_lat: number | null;
  map_lng: number | null;
  main_image_url: string | null;
  at_a_glance_description?: string | null;
  walkability_rating?: string | null;
  beach_type?: string | null;
  getting_around_summary?: string | null;
  dining_town_center_details?: string | null;
  parking_details?: string | null;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10";
const labelClass = "block text-sm font-medium text-zinc-700";

type Props = { townId: string };

export function AdminTownEditClient({ townId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [town, setTown] = useState<TownRow | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [mapLat, setMapLat] = useState("");
  const [mapLng, setMapLng] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [atAGlance, setAtAGlance] = useState("");
  const [walkability, setWalkability] = useState("");
  const [beachType, setBeachType] = useState("");
  const [gettingAround, setGettingAround] = useState("");
  const [diningDetails, setDiningDetails] = useState("");
  const [parkingDetails, setParkingDetails] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/towns/${encodeURIComponent(townId)}`)
      .then(async (res) => {
        const j = (await res.json()) as { town?: TownRow; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        const t = j.town!;
        setTown(t);
        setTitle(String(t.title ?? ""));
        setSlug(String(t.slug ?? ""));
        setStatus(String(t.status ?? "draft"));
        setExcerpt(String(t.excerpt ?? ""));
        setContent(String(t.content ?? ""));
        setSeoTitle(String(t.seo_title ?? ""));
        setSeoDescription(String(t.seo_description ?? ""));
        setMapLat(t.map_lat != null ? String(t.map_lat) : "");
        setMapLng(t.map_lng != null ? String(t.map_lng) : "");
        setMainImageUrl(String(t.main_image_url ?? ""));
        setAtAGlance(String(t.at_a_glance_description ?? ""));
        setWalkability(String(t.walkability_rating ?? ""));
        setBeachType(String(t.beach_type ?? ""));
        setGettingAround(String(t.getting_around_summary ?? ""));
        setDiningDetails(String(t.dining_town_center_details ?? ""));
        setParkingDetails(String(t.parking_details ?? ""));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [townId]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);
    const body = {
      title: title.trim(),
      slug: slug.trim(),
      status,
      excerpt,
      content,
      seo_title: seoTitle,
      seo_description: seoDescription,
      map_lat: mapLat.trim() ? Number(mapLat) : null,
      map_lng: mapLng.trim() ? Number(mapLng) : null,
      main_image_url: mainImageUrl.trim() || null,
      at_a_glance_description: atAGlance,
      walkability_rating: walkability,
      beach_type: beachType,
      getting_around_summary: gettingAround,
      dining_town_center_details: diningDetails,
      parking_details: parkingDetails,
    };
    try {
      const res = await fetch(`/api/admin/towns/${encodeURIComponent(townId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  if (loading) return <p className="text-sm text-zinc-500">Loading town…</p>;
  if (!town) return <p className="text-sm text-red-600">Town not found.</p>;

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

      <label className={labelClass}>
        Excerpt
        <textarea className={inputClass} rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      </label>

      <label className={labelClass}>
        Content (markdown)
        <textarea className={inputClass} rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          SEO title
          <input className={inputClass} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </label>
        <label className={labelClass}>
          SEO description
          <input
            className={inputClass}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </label>
      </div>

      <label className={labelClass}>
        Main image URL
        <input className={inputClass} value={mainImageUrl} onChange={(e) => setMainImageUrl(e.target.value)} />
      </label>

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

      <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <legend className="text-sm font-semibold text-zinc-900">At a glance (MVP)</legend>
        <label className={labelClass}>
          Description
          <textarea className={inputClass} rows={2} value={atAGlance} onChange={(e) => setAtAGlance(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Walkability
            <input className={inputClass} value={walkability} onChange={(e) => setWalkability(e.target.value)} />
          </label>
          <label className={labelClass}>
            Beach type
            <input className={inputClass} value={beachType} onChange={(e) => setBeachType(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          Getting around
          <input className={inputClass} value={gettingAround} onChange={(e) => setGettingAround(e.target.value)} />
        </label>
        <label className={labelClass}>
          Dining & town center
          <textarea className={inputClass} rows={2} value={diningDetails} onChange={(e) => setDiningDetails(e.target.value)} />
        </label>
        <label className={labelClass}>
          Parking
          <textarea className={inputClass} rows={2} value={parkingDetails} onChange={(e) => setParkingDetails(e.target.value)} />
        </label>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save town"}
        </button>
        <Link href={`/town/${encodeURIComponent(slug)}`} className="text-sm font-medium text-zinc-600 underline">
          View public page
        </Link>
      </div>
    </form>
  );
}
