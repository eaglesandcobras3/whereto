"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  const [enriched, setEnriched] = useState(false);
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
      setEnriched(g.enriched);
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

  const canPublish = enriched || status === "published";

  const payload = useMemo(
    () => ({
      title,
      slug: slug.trim() || undefined,
      content,
      status,
      guide_type: guideType,
      town_id: townId || null,
      area_id: areaId || null,
      business_ids: businessIds,
    }),
    [title, slug, content, status, guideType, townId, areaId, businessIds],
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
    const j = (await res.json()) as { error?: string; enrichedAt?: string };
    setEnriching(false);
    if (!res.ok) {
      setError(j.error ?? "Enrichment failed");
      return;
    }
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

  if (loading) return <p className="text-sm text-zinc-500">Loading guide…</p>;

  return (
    <div className="space-y-8">
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Guide title"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Slug</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
              placeholder="auto-generated from title"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Markdown content</span>
            <p className="mt-0.5 text-xs text-zinc-500">
              Markdown only. Embed businesses with{" "}
              <code className="rounded bg-zinc-100 px-1">[[business-slug]]</code>.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={22}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm leading-relaxed"
              placeholder="# Your guide&#10;&#10;Write in markdown…"
            />
          </label>
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
                {STATUSES.map((s) => (
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
              <button
                type="button"
                onClick={() => enrich()}
                disabled={enriching || isNew || !content.trim()}
                className="w-full rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
              >
                {enriching ? "Enriching…" : enriched ? "Re-enrich" : "Enrich"}
              </button>
            </div>

            {!enriched ? (
              <p className="mt-3 text-xs text-amber-700">
                Enrich generates SEO fields and search profile. Publishing is blocked until enriched.
              </p>
            ) : (
              <p className="mt-3 text-xs text-emerald-700">Enriched — ready to publish.</p>
            )}
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

          {enriched && seoPreview.seo_title ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <h2 className="font-semibold text-zinc-900">SEO preview</h2>
              <dl className="mt-3 space-y-2 text-xs text-zinc-600">
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
            </div>
          ) : null}

          {!isNew && slug ? (
            <Link
              href={`/guide/${encodeURIComponent(slug)}`}
              target="_blank"
              className="block text-center text-sm text-[var(--color-primary)] hover:underline"
            >
              Preview public page ↗
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
