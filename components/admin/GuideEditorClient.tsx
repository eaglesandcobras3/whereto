"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GuideMarkdownEditor } from "@/components/admin/GuideMarkdownEditor";

type PickerOption = { id: string; label: string; sublabel?: string };

type GuideDetail = {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  guide_type: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  search_keywords: string | null;
  summary: string | null;
  excerpt: string | null;
  intent_tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  enriched: boolean;
  town_id: string | null;
  area_id: string | null;
  business_ids: string[];
  business_labels?: Record<string, string>;
  main_image_url?: string | null;
  main_image_preview_url?: string | null;
};

const GUIDE_TYPES = ["editorial", "seasonal", "town", "intent"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

type Props = {
  guideId?: string;
};

export function GuideEditorClient({ guideId }: Props) {
  const isNew = !guideId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("draft");
  const [guideType, setGuideType] = useState<(typeof GUIDE_TYPES)[number]>("editorial");
  const [townId, setTownId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [businessLabels, setBusinessLabels] = useState<Record<string, string>>({});
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);

  const [seoPreview, setSeoPreview] = useState<Partial<GuideDetail>>({});

  const [towns, setTowns] = useState<PickerOption[]>([]);
  const [areas, setAreas] = useState<PickerOption[]>([]);
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessResults, setBusinessResults] = useState<PickerOption[]>([]);

  const loadOptions = useCallback(async (opts?: { townId?: string; businessQuery?: string }) => {
    const params = new URLSearchParams();
    if (opts?.townId) params.set("townId", opts.townId);
    if (opts?.businessQuery) params.set("businessQuery", opts.businessQuery);
    const res = await fetch(`/api/admin/guides/options?${params.toString()}`);
    const j = (await res.json()) as {
      towns?: PickerOption[];
      areas?: PickerOption[];
      businesses?: PickerOption[];
      error?: string;
    };
    if (!res.ok) throw new Error(j.error ?? "Failed to load options");
    if (j.towns) setTowns(j.towns);
    if (j.areas) setAreas(j.areas);
    if (j.businesses) setBusinessResults(j.businesses);
  }, []);

  const loadGuide = useCallback(async () => {
    if (!guideId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/guides/${encodeURIComponent(guideId)}`);
      const j = (await res.json()) as { guide?: GuideDetail; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load guide");
      const g = j.guide;
      if (!g) throw new Error("Guide not found");
      setTitle(g.title);
      setSlug(g.slug);
      setContent(g.content);
      setStatus(g.status as (typeof STATUSES)[number]);
      setGuideType((g.guide_type as (typeof GUIDE_TYPES)[number]) ?? "editorial");
      setTownId(g.town_id ?? "");
      setAreaId(g.area_id ?? "");
      setBusinessIds(g.business_ids);
      setBusinessLabels(g.business_labels ?? {});
      setMainImageUrl(g.main_image_url ?? null);
      setMainImagePreview(g.main_image_preview_url ?? g.main_image_url ?? null);
      setSeoPreview({
        seo_title: g.seo_title,
        seo_description: g.seo_description,
        og_title: g.og_title,
        og_description: g.og_description,
        search_keywords: g.search_keywords,
        summary: g.summary,
        excerpt: g.excerpt,
        intent_tags: g.intent_tags,
        custom_fields: g.custom_fields,
      });
      await loadOptions({ townId: g.town_id ?? undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [guideId, loadOptions]);

  useEffect(() => {
    if (isNew) {
      loadOptions().catch(() => {});
    } else {
      loadGuide();
    }
  }, [isNew, loadGuide, loadOptions]);

  useEffect(() => {
    if (townId) {
      loadOptions({ townId }).catch(() => {});
    }
  }, [townId, loadOptions]);

  useEffect(() => {
    if (businessQuery.trim().length < 2) {
      setBusinessResults([]);
      return;
    }
    const t = setTimeout(() => {
      loadOptions({ businessQuery }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [businessQuery, loadOptions]);

  const hasSearchProfile = Boolean(
    typeof seoPreview.custom_fields?.search_profile === "string" &&
      seoPreview.custom_fields.search_profile.trim(),
  );

  const canPublish = hasSearchProfile || status === "published";

  const payload = useMemo(
    () => ({
      title,
      content,
      status,
      guide_type: guideType,
      town_id: townId || null,
      area_id: areaId || null,
      business_ids: businessIds,
      main_image_url: mainImageUrl,
    }),
    [title, content, status, guideType, townId, areaId, businessIds, mainImageUrl],
  );

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const url = isNew ? "/api/admin/guides" : `/api/admin/guides/${encodeURIComponent(guideId!)}`;
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as { error?: string; id?: string; slug?: string; ok?: boolean };
    setSaving(false);
    if (!res.ok) {
      setError(j.error ?? "Save failed");
      return;
    }
    setMessage("Saved.");
    if (isNew && j.id) {
      window.location.href = `/admin/guides/${encodeURIComponent(j.id)}`;
      return;
    }
    if (j.slug) setSlug(j.slug);
    await loadGuide();
  }

  async function enrich() {
    if (!guideId) {
      setError("Save the guide as a draft before enriching.");
      return;
    }
    setEnriching(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/guides/${encodeURIComponent(guideId)}/enrich`, {
      method: "POST",
    });
    const j = (await res.json()) as { error?: string; enrichedAt?: string; slug?: string };
    setEnriching(false);
    if (!res.ok) {
      setError(j.error ?? "Enrichment failed");
      return;
    }
    if (j.slug) setSlug(j.slug);
    setMessage(`Enriched at ${j.enrichedAt ? new Date(j.enrichedAt).toLocaleString() : "now"}.`);
    await loadGuide();
  }

  function addBusiness(opt: PickerOption) {
    if (businessIds.includes(opt.id)) return;
    setBusinessIds((prev) => [...prev, opt.id]);
    setBusinessLabels((prev) => ({ ...prev, [opt.id]: opt.label }));
    setBusinessQuery("");
    setBusinessResults([]);
  }

  function removeBusiness(id: string) {
    setBusinessIds((prev) => prev.filter((x) => x !== id));
  }

  async function uploadMainImage(file: File) {
    setUploadingImage(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", `guides/${slug.trim() || "drafts"}`);
      form.append("alt_text", title.trim() || "Guide main image");
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: form });
      const j = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Upload failed");
      setMainImageUrl(j.url);
      setMainImagePreview(j.url);
      setMessage("Main image uploaded. Save to apply.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeMainImage() {
    setMainImageUrl(null);
    setMainImagePreview(null);
    setMessage("Main image removed. Save to apply.");
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading guide…</p>;

  return (
    <div className="space-y-8">
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-base font-medium text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              placeholder="Guide title"
            />
          </label>

          <div>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-zinc-800">Content</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Write in markdown. Use Preview or Split to check formatting before you save.
                </p>
              </div>
            </div>
            <GuideMarkdownEditor
              value={content}
              onChange={setContent}
              placeholder={"# Your guide\n\nStart with a short intro, then add sections, lists, and business embeds."}
            />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Publish</h2>
            <label className="mt-3 block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {STATUSES.filter((s) => s !== "published" || hasSearchProfile).map((s) => (
                  <option key={s} value={s} disabled={s === "published" && !canPublish}>
                    {s}
                    {s === "published" && !canPublish ? " (requires enrich)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Type</span>
              <select
                value={guideType}
                onChange={(e) => setGuideType(e.target.value as (typeof GUIDE_TYPES)[number])}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {GUIDE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => save()}
                disabled={saving || !title.trim() || !content.trim()}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {!hasSearchProfile ? (
                <button
                  type="button"
                  onClick={() => enrich()}
                  disabled={enriching || isNew || !content.trim()}
                  className="w-full rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
                >
                  {enriching ? "Enriching…" : "Enrich"}
                </button>
              ) : null}
            </div>

            {!hasSearchProfile ? (
              <p className="mt-3 text-xs text-amber-700">
                Save your draft, then run Enrich to generate SEO fields and a search profile. Publishing unlocks after that.
              </p>
            ) : (
              <p className="mt-3 text-xs text-emerald-700">Search profile ready — you can publish.</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Main image</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Shown on the guide page header and social previews. Markdown must not include images.
            </p>

            {mainImagePreview ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImagePreview}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-3 flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-500">
                No main image
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <label className="block">
                <span className="sr-only">Upload main image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadMainImage(file);
                  }}
                  className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                />
              </label>
              {mainImagePreview ? (
                <button
                  type="button"
                  onClick={() => removeMainImage()}
                  disabled={uploadingImage}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove image
                </button>
              ) : null}
              {uploadingImage ? (
                <p className="text-xs text-zinc-500">Uploading…</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Location & links</h2>

            <label className="mt-3 block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Town</span>
              <select
                value={townId}
                onChange={(e) => {
                  setTownId(e.target.value);
                  setAreaId("");
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {towns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Place / area</span>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                disabled={!townId && areas.length === 0}
              >
                <option value="">— None —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Linked businesses
              </span>
              <input
                type="search"
                value={businessQuery}
                onChange={(e) => setBusinessQuery(e.target.value)}
                placeholder="Search businesses…"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              {businessResults.length > 0 ? (
                <ul className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 text-sm">
                  {businessResults.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => addBusiness(b)}
                        className="w-full px-3 py-2 text-left hover:bg-white"
                      >
                        {b.label}
                        {b.sublabel ? (
                          <span className="ml-1 text-xs text-zinc-500">{b.sublabel}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {businessIds.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {businessIds.map((id) => (
                    <li
                      key={id}
                      className="flex items-center justify-between rounded bg-zinc-100 px-2 py-1 text-xs"
                    >
                      <span>{businessLabels[id] ?? id.slice(0, 8)}</span>
                      <button
                        type="button"
                        onClick={() => removeBusiness(id)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {hasSearchProfile && seoPreview.seo_title ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <h2 className="font-semibold text-zinc-900">SEO preview</h2>
              <dl className="mt-3 space-y-2 text-xs text-zinc-600">
                {slug ? (
                  <div>
                    <dt className="font-medium text-zinc-800">Public URL</dt>
                    <dd className="font-mono">/guide/{slug}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-medium text-zinc-800">SEO title</dt>
                  <dd>{seoPreview.seo_title}</dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-800">Meta description</dt>
                  <dd>{seoPreview.seo_description}</dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-800">Search profile</dt>
                  <dd>
                    {typeof seoPreview.custom_fields?.search_profile === "string"
                      ? seoPreview.custom_fields.search_profile
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-800">Keywords</dt>
                  <dd>{seoPreview.search_keywords}</dd>
                </div>
                {seoPreview.intent_tags?.length ? (
                  <div>
                    <dt className="font-medium text-zinc-800">Intent tags</dt>
                    <dd>{seoPreview.intent_tags.join(", ")}</dd>
                  </div>
                ) : null}
              </dl>
              {!isNew && slug ? (
                <Link
                  href={`/guide/${encodeURIComponent(slug)}`}
                  target="_blank"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  Preview public page
                  <span className="material-symbols-outlined !text-sm" aria-hidden>
                    open_in_new
                  </span>
                </Link>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
