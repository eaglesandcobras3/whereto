"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminBusinessRow } from "@/lib/admin/admin-business-direct-edit";
import { AdminBusinessMainImageControl } from "@/components/admin/AdminBusinessMainImageControl";
import { AdminBusinessPhotosManager } from "@/components/admin/AdminBusinessPhotosManager";

type OptionTown = { id: string; title: string; slug: string };
type OptionArea = { id: string; title: string; slug: string | null; town_id: string | null };
type OptionCategory = { id: string; title: string; slug: string; parent_category_id: string | null };

type Props = {
  businessId: string;
  photosEnabled: boolean;
  multipleCategoryEnabled?: boolean;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10";
const labelClass = "block text-sm font-medium text-zinc-700";

export function AdminBusinessEditClient({
  businessId,
  photosEnabled,
  multipleCategoryEnabled = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [business, setBusiness] = useState<AdminBusinessRow | null>(null);
  const [towns, setTowns] = useState<OptionTown[]>([]);
  const [areas, setAreas] = useState<OptionArea[]>([]);
  const [categories, setCategories] = useState<OptionCategory[]>([]);

  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [overview, setOverview] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [townId, setTownId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [isStorefront, setIsStorefront] = useState(true);
  const [isService, setIsService] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isExplorable, setIsExplorable] = useState(false);
  const [mapLat, setMapLat] = useState("");
  const [mapLng, setMapLng] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [regenerateSlug, setRegenerateSlug] = useState(false);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}`)
      .then(async (res) => {
        const j = (await res.json()) as {
          business?: AdminBusinessRow;
          category_ids?: string[];
          multiple_category?: boolean;
          options?: {
            towns?: OptionTown[];
            areas?: OptionArea[];
            categories?: OptionCategory[];
          };
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        const b = j.business!;
        setBusiness(b);
        setTowns(j.options?.towns ?? []);
        setAreas(j.options?.areas ?? []);
        setCategories(j.options?.categories ?? []);
        setTitle(b.title ?? "");
        setPhone(b.phone ?? "");
        setEmail(b.email ?? "");
        setWebsite(b.website ?? "");
        setAddress(b.address ?? "");
        setExcerpt(b.excerpt ?? "");
        setOverview(b.overview ?? "");
        setSeoTitle(b.seo_title ?? "");
        setSeoDescription(b.seo_description ?? "");
        setSearchKeywords(b.search_keywords ?? "");
        setServiceArea(b.service_area ?? "");
        setTownId(b.town_id ?? "");
        setAreaId(b.area_id ?? "");
        setCategoryId(b.primary_category_id ?? "");
        const memberships = j.category_ids?.length
          ? j.category_ids
          : b.primary_category_id
            ? [b.primary_category_id]
            : [];
        setCategoryIds(memberships);
        setIsStorefront(Boolean(b.is_storefront));
        setIsService(Boolean(b.is_service_business));
        setIsVerified(Boolean(b.is_verified));
        setIsExplorable(Boolean(b.is_explorable));
        setMapLat(b.map_lat != null ? String(b.map_lat) : "");
        setMapLng(b.map_lng != null ? String(b.map_lng) : "");
        setSearchTags((b.search_tags ?? []).join(" | "));
        setMainImageUrl(b.main_image_url ?? b.hero_image_url ?? null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const areasForTown = useMemo(() => {
    if (!townId) return areas;
    return areas.filter((a) => !a.town_id || a.town_id === townId);
  }, [areas, townId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);

    const parseCoord = (raw: string): number | null => {
      const t = raw.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };

    const tags = searchTags
      .split(/\s*\|\s*|\s*,\s*/)
      .map((t) => t.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      title,
      phone,
      email,
      website,
      address,
      excerpt,
      overview,
      seo_title: seoTitle,
      seo_description: seoDescription,
      search_keywords: searchKeywords,
      service_area: serviceArea,
      town_id: townId || null,
      area_id: areaId || null,
      primary_category_id: categoryId || null,
      is_storefront: isStorefront,
      is_service_business: isService,
      is_verified: isVerified,
      is_explorable: isExplorable && isStorefront,
      map_lat: parseCoord(mapLat),
      map_lng: parseCoord(mapLng),
      search_tags: tags,
      regenerate_slug: regenerateSlug,
    };
    if (multipleCategoryEnabled) {
      const ids = categoryIds.includes(categoryId) || !categoryId
        ? categoryIds
        : [categoryId, ...categoryIds.filter((id) => id !== categoryId)];
      body.category_ids = ids.slice(0, 5);
      if (categoryId && !ids.includes(categoryId)) {
        body.primary_category_id = categoryId;
      }
    }

    try {
      const res = await fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as {
        business?: AdminBusinessRow;
        changes?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      if (j.business) {
        setBusiness(j.business);
        setRegenerateSlug(false);
      }
      setOk(`Saved: ${(j.changes ?? []).join(", ") || "ok"}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (!business) {
    return (
      <div>
        <p className="text-sm text-red-600">{err ?? "Business not found"}</p>
        <Link href="/admin/businesses" className="mt-4 inline-block text-sm underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        <p>
          <span className="font-medium">{business.title}</span>{" "}
          <span className="font-mono text-xs text-zinc-500">{business.slug}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">status: {business.status ?? "—"}</p>
        <a
          href={`/business/${encodeURIComponent(business.slug)}`}
          className="mt-2 inline-block text-xs font-medium text-teal-800 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          View public page
        </a>
      </div>

      <form onSubmit={(e) => void save(e)} className="space-y-5">
        <label className={labelClass}>
          Title
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={regenerateSlug}
            onChange={(e) => setRegenerateSlug(e.target.checked)}
          />
          Regenerate slug from title on save
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Phone
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className={labelClass}>
            Email
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          Website
          <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
        <label className={labelClass}>
          Address
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Town
            <select
              className={inputClass}
              value={townId}
              onChange={(e) => {
                setTownId(e.target.value);
                setAreaId("");
              }}
            >
              <option value="">—</option>
              {towns.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Area
            <select className={inputClass} value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">—</option>
              {areasForTown.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          {multipleCategoryEnabled ? "Primary category" : "Category"}
          <select
            className={inputClass}
            value={categoryId}
            onChange={(e) => {
              const next = e.target.value;
              setCategoryId(next);
              if (multipleCategoryEnabled && next) {
                setCategoryIds((prev) =>
                  prev.includes(next) ? prev : [next, ...prev].slice(0, 5),
                );
              }
            }}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        {multipleCategoryEnabled ? (
          <fieldset className="space-y-2 rounded-xl border border-zinc-200 p-3">
            <legend className="px-1 text-sm font-medium text-zinc-700">
              Additional categories (max 5 total)
            </legend>
            <p className="text-xs text-zinc-500">
              Primary is always included. Check other leaves this business should appear under.
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {categories.map((c) => {
                const checked = categoryIds.includes(c.id);
                const isPrimary = c.id === categoryId;
                return (
                  <label key={c.id} className="flex items-center gap-2 text-zinc-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isPrimary}
                      onChange={(e) => {
                        if (isPrimary) return;
                        setCategoryIds((prev) => {
                          if (e.target.checked) {
                            if (prev.length >= 5) return prev;
                            return [...prev, c.id];
                          }
                          return prev.filter((id) => id !== c.id);
                        });
                      }}
                    />
                    <span>
                      {c.title}
                      {isPrimary ? " (primary)" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isStorefront}
              onChange={(e) => setIsStorefront(e.target.checked)}
            />
            Storefront
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isService} onChange={(e) => setIsService(e.target.checked)} />
            Service business
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
            />
            Verified
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isExplorable}
              onChange={(e) => setIsExplorable(e.target.checked)}
              disabled={!isStorefront}
            />
            Show on town/area pages
          </label>
        </div>

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

        <label className={labelClass}>
          Excerpt
          <textarea
            className={inputClass}
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Overview
          <textarea
            className={inputClass}
            rows={5}
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          SEO title
          <input className={inputClass} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </label>
        <label className={labelClass}>
          SEO description
          <textarea
            className={inputClass}
            rows={2}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Search keywords
          <input
            className={inputClass}
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Service area
          <input
            className={inputClass}
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          Search tags <span className="font-normal text-zinc-500">(pipe-separated)</span>
          <input
            className={inputClass}
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
            placeholder="coffee | outdoor_seating"
          />
        </label>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {photosEnabled ? (
        <div className="space-y-4 border-t border-zinc-200 pt-8">
          <h2 className="text-lg font-semibold text-zinc-900">Photos</h2>
          <AdminBusinessMainImageControl
            businessId={businessId}
            currentImageUrl={mainImageUrl}
            onUpdated={(url) => setMainImageUrl(url)}
          />
          <AdminBusinessPhotosManager businessId={businessId} />
        </div>
      ) : (
        <p className="border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          Photo tools require the <code className="rounded bg-zinc-100 px-1">business_photos</code>{" "}
          flag.
        </p>
      )}
    </div>
  );
}
