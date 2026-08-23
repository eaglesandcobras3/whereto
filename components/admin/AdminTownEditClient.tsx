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
import { PLACE_STATUSES } from "@/lib/admin/place-constants";
import { includedOnHubBrowse } from "@/lib/places/hub-browse-visibility";

type TownRow = Record<string, unknown> & {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: string | null;
  include_on_towns_hub: boolean | null;
  map_lat: number | null;
  map_lng: number | null;
  main_image_url: string | null;
  hero_image_url?: string | null;
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
  const [includeOnTownsHub, setIncludeOnTownsHub] = useState(true);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [mapLat, setMapLat] = useState("");
  const [mapLng, setMapLng] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [atAGlance, setAtAGlance] = useState<AdminAtAGlanceValues>(EMPTY_ADMIN_AT_A_GLANCE);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/towns/${encodeURIComponent(townId)}`)
      .then(async (res) => {
        const j = (await res.json()) as { town?: TownRow; error?: string };
        if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load");
        const t = j.town!;
        setTown(t);
        setTitle(String(t.title ?? ""));
        setSlug(String(t.slug ?? ""));
        setStatus(String(t.status ?? "draft"));
        setIncludeOnTownsHub(includedOnHubBrowse(t.include_on_towns_hub as boolean | null));
        setExcerpt(String(t.excerpt ?? ""));
        setContent(String(t.content ?? ""));
        setSeoTitle(String(t.seo_title ?? ""));
        setSeoDescription(String(t.seo_description ?? ""));
        setMapLat(t.map_lat != null ? String(t.map_lat) : "");
        setMapLng(t.map_lng != null ? String(t.map_lng) : "");
        setMainImageUrl(t.main_image_url ?? (t.hero_image_url as string | null) ?? null);
        setAtAGlance(atAGlanceValuesFromRow(t));
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
      include_on_towns_hub: includeOnTownsHub,
      excerpt,
      content,
      seo_title: seoTitle,
      seo_description: seoDescription,
      map_lat: mapLat.trim() ? Number(mapLat) : null,
      map_lng: mapLng.trim() ? Number(mapLng) : null,
      ...atAGlancePatchFromValues(atAGlance),
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
  if (!town) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{err ?? "Town not found."}</p>
        <Link href="/admin/towns" className="text-sm font-medium text-zinc-600 underline">
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
          checked={includeOnTownsHub}
          onChange={(e) => setIncludeOnTownsHub(e.target.checked)}
        />
        <span>
          Show on <code className="rounded bg-zinc-100 px-1 text-xs">/towns</code> hub
          <span className="mt-0.5 block text-xs text-zinc-500">
            Null or checked = linked on the public site. Only explicit off hides footer, sitemap, and
            town pages (Discover/search still work). Use off for outlier towns you only tie to
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

      <AdminPlaceMainImageControl
        entity="town"
        entityId={townId}
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

      <AdminAtAGlanceFields values={atAGlance} onChange={setAtAGlance} placeLabel="town" />

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
