"use client";

import { useEffect, useMemo, useState } from "react";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { SubmissionThankYou } from "@/components/listing-request/SubmissionThankYou";
import { FacetTypeaheadMultiSelect } from "@/components/discovery/FacetTypeaheadMultiSelect";
import { captureEvent } from "@/lib/analytics/gtag-runner";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";
import {
  FREE_ONBOARD_EXCERPT_MAX,
  FREE_ONBOARD_LOCATIONS_MAX,
  FREE_ONBOARD_OVERVIEW_MAX,
  FREE_ONBOARD_REMOVAL_REASON_MAX,
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  FREE_ONBOARD_SUGGESTED_CATEGORY_MAX,
  FREE_ONBOARD_TITLE_MAX,
} from "@/lib/listing-requests/free-onboard-schema";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";
const helpClass = "mt-1 text-xs text-[var(--color-text-tertiary)]";

type CategoryOption = {
  id: string;
  title: string;
  slug: string;
  rollupTitle?: string;
  rollupSlug?: string;
};
type CategoryGroup = {
  id: string;
  title: string;
  slug: string;
  leaves: Array<{ id: string; title: string; slug: string }>;
};
type LocationRow = { key: string; town_id: string; address: string };

type PrefillBusiness = {
  id: string;
  title: string;
  slug: string;
  town_id: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  excerpt: string | null;
  overview: string | null;
  is_storefront: boolean;
  is_service_business: boolean;
  category_id: string | null;
  service_category_id: string | null;
  search_tags: string[];
  main_image_url?: string | null;
};

type Props = {
  towns: ListBusinessTownOption[];
  /** Prefill from existing listing slug (update/claim). */
  businessSlug?: string | null;
};

function newLocationKey() {
  return `loc-${Math.random().toString(36).slice(2, 10)}`;
}

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <p className={helpClass}>
      {value.length}/{max}
    </p>
  );
}

export function FreeOnboardForm({ towns, businessSlug }: Props) {
  const isUpdate = Boolean(businessSlug);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [doneRemoval, setDoneRemoval] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [searchTagOptions, setSearchTagOptions] = useState<DiscoverSearchTagOption[]>([]);
  const [tagsByCategoryId, setTagsByCategoryId] = useState<Record<string, string[]>>({});
  const [prefill, setPrefill] = useState<PrefillBusiness | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removalName, setRemovalName] = useState("");
  const [removalEmail, setRemovalEmail] = useState("");
  const [removalReason, setRemovalReason] = useState("");
  const [removalPending, setRemovalPending] = useState(false);
  const [removalErr, setRemovalErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [overview, setOverview] = useState("");
  const [locations, setLocations] = useState<LocationRow[]>([
    { key: newLocationKey(), town_id: "", address: "" },
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState("");
  const [suggestedCategoryOpen, setSuggestedCategoryOpen] = useState(false);
  const [isStorefront, setIsStorefront] = useState(false);
  const [isService, setIsService] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  // Listing photo upload temporarily disabled — approve cannot write image URL columns yet.

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/listing-requests/form-options", {
          signal: controller.signal,
        });
        const j = (await res.json()) as {
          categories?: CategoryOption[];
          categoryGroups?: CategoryGroup[];
          searchTags?: string[];
          searchTagOptions?: DiscoverSearchTagOption[];
          tagsByCategoryId?: Record<string, string[]>;
          isAdmin?: boolean;
          adminName?: string | null;
          adminEmail?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Could not load form options");
        setCategories(j.categories ?? []);
        setCategoryGroups(j.categoryGroups ?? []);
        setSearchTagOptions(
          j.searchTagOptions?.length
            ? j.searchTagOptions
            : (j.searchTags ?? []).map((slug) => ({
                slug,
                label: formatSearchTagLabel(slug),
              })),
        );
        setTagsByCategoryId(j.tagsByCategoryId ?? {});
        setIsAdmin(Boolean(j.isAdmin));
        setAdminName((j.adminName ?? "").trim());
        setAdminEmail((j.adminEmail ?? "").trim());
      } catch (e) {
        if (controller.signal.aborted) return;
        setErr(e instanceof Error ? e.message : "Could not load form options");
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!businessSlug) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/listing-requests/prefill?slug=${encodeURIComponent(businessSlug)}`,
          { signal: controller.signal },
        );
        const j = (await res.json()) as { business?: PrefillBusiness; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Could not load listing");
        const b = j.business;
        if (!b) return;
        setPrefill(b);
        setTitle(b.title);
        setExcerpt((b.excerpt ?? "").slice(0, FREE_ONBOARD_EXCERPT_MAX));
        setOverview((b.overview ?? "").slice(0, FREE_ONBOARD_OVERVIEW_MAX));
        setCategoryId(b.category_id ?? b.service_category_id ?? "");
        setSelectedTags((b.search_tags ?? []).slice(0, FREE_ONBOARD_SEARCH_TAGS_MAX));
        setIsStorefront(Boolean(b.is_storefront));
        setIsService(Boolean(b.is_service_business));
        setLocations([
          {
            key: newLocationKey(),
            town_id: b.town_id ?? "",
            address: b.address ?? "",
          },
        ]);
      } catch (e) {
        if (controller.signal.aborted) return;
        setErr(e instanceof Error ? e.message : "Could not load listing");
      }
    })();
    return () => controller.abort();
  }, [businessSlug]);

  const tagOptions: DiscoverSearchTagOption[] = useMemo(() => {
    const bySlug = new Map(searchTagOptions.map((t) => [t.slug, t]));
    for (const t of selectedTags) {
      if (!bySlug.has(t)) bySlug.set(t, { slug: t, label: formatSearchTagLabel(t) });
    }
    return Array.from(bySlug.values()).sort((a, b) => a.slug.localeCompare(b.slug));
  }, [searchTagOptions, selectedTags]);

  const categorySuggestedTags = useMemo(() => {
    if (!categoryId) return [];
    const slugs = tagsByCategoryId[categoryId] ?? [];
    const bySlug = new Map(searchTagOptions.map((t) => [t.slug, t]));
    return slugs
      .map((slug) => bySlug.get(slug) ?? { slug, label: formatSearchTagLabel(slug) })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryId, tagsByCategoryId, searchTagOptions]);

  const tagSlotsUsed = selectedTags.length + suggestedTags.length;
  const atTagCap = tagSlotsUsed >= FREE_ONBOARD_SEARCH_TAGS_MAX;

  function toggleCategorySuggestedTag(slug: string) {
    if (selectedTags.includes(slug)) {
      setSelectedTags(selectedTags.filter((t) => t !== slug));
      return;
    }
    if (atTagCap) return;
    setSelectedTags([...selectedTags, slug]);
  }

  function setStorefrontChecked(checked: boolean) {
    setIsStorefront(checked);
    if (checked && locations.length === 0) {
      setLocations([{ key: newLocationKey(), town_id: "", address: "" }]);
    }
  }

  function setServiceChecked(checked: boolean) {
    setIsService(checked);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErr(null);

    if (!isStorefront && !isService) {
      setPending(false);
      setErr("Select whether you have a physical location, operate as a service business, or both.");
      return;
    }

    const suggestedCategoryTrimmed = suggestedCategory.trim().slice(0, FREE_ONBOARD_SUGGESTED_CATEGORY_MAX);
    if (!categoryId && !suggestedCategoryTrimmed) {
      setPending(false);
      setErr("Choose a category or suggest one that is missing from the list.");
      return;
    }
    const locationPayload = isStorefront
      ? locations.map((l) => ({
          town_id: l.town_id,
          address: l.address,
        }))
      : [];

    if (isStorefront && locationPayload.some((l) => !l.town_id)) {
      setPending(false);
      setErr("Choose a town for each location.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const payload = {
      _hp_company_website: String(fd.get("_hp_company_website") ?? ""),
      submitter_name: isAdmin ? adminName : String(fd.get("submitter_name") ?? ""),
      submitter_email: isAdmin ? adminEmail : String(fd.get("submitter_email") ?? ""),
      title: title.trim(),
      is_storefront: isStorefront,
      is_service_business: isService,
      locations: locationPayload,
      website: String(fd.get("website") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      excerpt: excerpt.trim(),
      overview: overview.trim(),
      category_id: categoryId || null,
      service_category_id: null,
      suggested_category: suggestedCategoryTrimmed || null,
      search_tags: selectedTags,
      suggested_tags: suggestedTags.slice(
        0,
        Math.max(0, FREE_ONBOARD_SEARCH_TAGS_MAX - selectedTags.length),
      ),
      is_explorable: false,
      marketing_opt_in: isAdmin ? false : fd.get("marketing_opt_in") === "on",
      target_business_id: prefill?.id ?? null,
      target_business_slug: prefill?.slug ?? businessSlug ?? null,
    };

    if (selectedTags.length + payload.suggested_tags.length > FREE_ONBOARD_SEARCH_TAGS_MAX) {
      setPending(false);
      setErr(
        `Choose at most ${FREE_ONBOARD_SEARCH_TAGS_MAX} tags total across search tags and suggested tags.`,
      );
      return;
    }

    const res = await fetch("/api/listing-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };
    setPending(false);

    if (!res.ok) {
      if (j.fieldErrors) {
        const first = Object.values(j.fieldErrors).flat()[0];
        setErr(first ?? j.error ?? "Something went wrong.");
      } else {
        setErr(j.error ?? "Something went wrong.");
      }
      return;
    }

    setDone(true);
    captureEvent("listing_request_submitted", {
      business_title: payload.title,
      free_onboard: true,
      is_update: isUpdate,
      location_count: payload.locations.length,
    });
  }

  async function submitRemoval() {
    setRemovalErr(null);
    const name = removalName.trim();
    const email = removalEmail.trim();
    const reason = removalReason.trim();
    if (!name || !email) {
      setRemovalErr("Name and email are required so we can confirm ownership.");
      return;
    }
    if (reason.length < 10) {
      setRemovalErr("Please share a brief reason for removal (at least 10 characters).");
      return;
    }
    if (!businessSlug && !prefill?.slug) {
      setRemovalErr("Missing listing. Refresh the page and try again.");
      return;
    }

    setRemovalPending(true);
    const res = await fetch("/api/listing-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "removal",
        submitter_name: name,
        submitter_email: email,
        reason,
        target_business_id: prefill?.id ?? null,
        target_business_slug: prefill?.slug ?? businessSlug,
      }),
    });
    const j = (await res.json()) as {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };
    setRemovalPending(false);

    if (!res.ok) {
      if (j.fieldErrors) {
        const first = Object.values(j.fieldErrors).flat()[0];
        setRemovalErr(first ?? j.error ?? "Something went wrong.");
      } else {
        setRemovalErr(j.error ?? "Something went wrong.");
      }
      return;
    }

    setRemovalOpen(false);
    setDoneRemoval(true);
    setDone(true);
    captureEvent("listing_request_submitted", {
      business_title: prefill?.title ?? businessSlug ?? "listing",
      free_onboard: true,
      is_removal: true,
    });
  }

  if (done) {
    return (
      <div className="not-prose mt-10 space-y-6">
        <div
          className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 shadow-sm"
          role="status"
        >
          <SubmissionThankYou variant={doneRemoval ? "removal" : "default"} />
        </div>
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
          onClick={() => {
            setDone(false);
            setDoneRemoval(false);
          }}
        >
          Submit another request
        </button>
      </div>
    );
  }

  if (optionsLoading) {
    return <p className="not-prose mt-8 text-sm text-[var(--color-text-secondary)]">Loading form…</p>;
  }

  const showLocations = isStorefront;

  return (
    <form onSubmit={submit} className="not-prose mt-10 space-y-6">
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="_hp_company_website">Company website</label>
        <input id="_hp_company_website" name="_hp_company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {isAdmin ? (
          <div className="sm:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            Signed in as admin
            {adminEmail ? (
              <>
                {" "}
                (<span className="font-medium text-[var(--color-text-primary)]">{adminEmail}</span>
                ). Name and email are filled for you; confirmation emails are skipped for admin submissions.
              </>
            ) : (
              <> — name and email are filled from your account.</>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass} htmlFor="submitter_name">
                Name
              </label>
              <input id="submitter_name" name="submitter_name" required className={`${inputClass} mt-1.5`} />
            </div>
            <div>
              <label className={labelClass} htmlFor="submitter_email">
                Email
              </label>
              <input
                id="submitter_email"
                name="submitter_email"
                type="email"
                required
                autoComplete="email"
                className={`${inputClass} mt-1.5`}
              />
            </div>
          </>
        )}
      </div>

      {!isAdmin ? (
        <label className="flex w-full cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="marketing_opt_in"
            defaultChecked
            className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--color-border-strong)]"
          />
          <span>Yes, send me marketing emails about WhereTo30A for business owners.</span>
        </label>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="title">
          Business or service name
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={FREE_ONBOARD_TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${inputClass} mt-1.5`}
        />
        <CharCount value={title} max={FREE_ONBOARD_TITLE_MAX} />
      </div>

      <fieldset className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4">
        <legend className={`${labelClass} px-1`}>How do customers work with you?</legend>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Select all that apply — some businesses are both a storefront and a service provider.
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isStorefront}
            onChange={(e) => setStorefrontChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>Customers visit our physical location (storefront)</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isService}
            onChange={(e) => setServiceChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>We provide services at customers&apos; locations or by appointment</span>
        </label>
      </fieldset>

      {showLocations ? (
        <div className="space-y-4">
          <div>
            <p className={labelClass}>Locations</p>
            <p className={helpClass}>Select town and provide address for each location</p>
          </div>

          {locations.map((loc, index) => (
            <div
              key={loc.key}
              className="space-y-3 rounded-xl border border-[var(--color-border)] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Location {index + 1}
                </p>
                {locations.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs text-red-700 underline-offset-2 hover:underline"
                    onClick={() => setLocations((prev) => prev.filter((l) => l.key !== loc.key))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div>
                <label className={labelClass} htmlFor={`town-${loc.key}`}>
                  Town
                </label>
                <select
                  id={`town-${loc.key}`}
                  required
                  value={loc.town_id}
                  onChange={(e) =>
                    setLocations((prev) =>
                      prev.map((l) => (l.key === loc.key ? { ...l, town_id: e.target.value } : l)),
                    )
                  }
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">Choose a town</option>
                  {towns.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor={`address-${loc.key}`}>
                  Address
                </label>
                <input
                  id={`address-${loc.key}`}
                  value={loc.address}
                  onChange={(e) =>
                    setLocations((prev) =>
                      prev.map((l) => (l.key === loc.key ? { ...l, address: e.target.value } : l)),
                    )
                  }
                  className={`${inputClass} mt-1.5`}
                  placeholder="Street, suite"
                />
              </div>
            </div>
          ))}

          {locations.length < FREE_ONBOARD_LOCATIONS_MAX ? (
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-[var(--color-text-tertiary)] underline underline-offset-2 hover:text-[var(--color-primary)]"
                onClick={() =>
                  setLocations((prev) => [
                    ...prev,
                    { key: newLocationKey(), town_id: "", address: "" },
                  ])
                }
              >
                Add additional location
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="website">
            Website
          </label>
          <input
            name="website"
            id="website"
            type="text"
            inputMode="url"
            autoComplete="url"
            defaultValue={prefill?.website ?? ""}
            placeholder="example.com"
            className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            name="phone"
            id="phone"
            type="tel"
            defaultValue={prefill?.phone ?? ""}
            className={`${inputClass} mt-1.5`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="excerpt">
          Headline / summary
        </label>
        <textarea
          id="excerpt"
          required
          rows={2}
          maxLength={FREE_ONBOARD_EXCERPT_MAX}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className={`${inputClass} mt-1.5`}
          placeholder="One short line that captures the business."
        />
        <CharCount value={excerpt} max={FREE_ONBOARD_EXCERPT_MAX} />
      </div>

      <div>
        <label className={labelClass} htmlFor="overview">
          Overview description
        </label>
        <textarea
          id="overview"
          required
          rows={4}
          maxLength={FREE_ONBOARD_OVERVIEW_MAX}
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          className={`${inputClass} mt-1.5`}
          placeholder="A short overview visitors will read on the listing."
        />
        <CharCount value={overview} max={FREE_ONBOARD_OVERVIEW_MAX} />
      </div>

      <div>
        <label className={labelClass} htmlFor="category_id">
          Category
        </label>
        <p className={helpClass}>
          Pick the closest fit — used on Categories, Businesses, and Services browse hubs.
        </p>
        <select
          id="category_id"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            if (e.target.value) {
              setSuggestedCategory("");
              setSuggestedCategoryOpen(false);
            }
          }}
          className={`${inputClass} mt-1.5`}
          disabled={!isStorefront && !isService}
        >
          <option value="">
            {isStorefront || isService
              ? "Choose a category"
              : "Select how customers work with you first"}
          </option>
          {categoryGroups.length > 0
            ? categoryGroups.map((g) => (
                <optgroup key={g.id} label={g.title}>
                  {g.leaves.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </optgroup>
              ))
            : categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rollupTitle ? `${c.rollupTitle} — ${c.title}` : c.title}
                </option>
              ))}
        </select>
        {isStorefront || isService ? (
          <div className="mt-1.5 flex items-center justify-end">
            {!suggestedCategoryOpen ? (
              <button
                type="button"
                onClick={() => setSuggestedCategoryOpen(true)}
                className="shrink-0 text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Can&apos;t find yours? Suggest one
              </button>
            ) : null}
          </div>
        ) : null}
        {suggestedCategoryOpen && (isStorefront || isService) ? (
          <div className="mt-3">
            <label className={labelClass} htmlFor="suggested_category">
              Suggested category
            </label>
            <p className={helpClass}>
              Our team reviews suggestions before they go live. You can leave the list above empty
              if none of the options fit.
            </p>
            <input
              id="suggested_category"
              name="suggested_category"
              value={suggestedCategory}
              onChange={(e) => {
                const next = e.target.value.slice(0, FREE_ONBOARD_SUGGESTED_CATEGORY_MAX);
                setSuggestedCategory(next);
                if (next.trim()) setCategoryId("");
              }}
              className={`${inputClass} mt-1.5`}
              placeholder="e.g. Kayak rentals"
              maxLength={FREE_ONBOARD_SUGGESTED_CATEGORY_MAX}
              autoComplete="off"
            />
          </div>
        ) : null}
      </div>

      <div>
        <p className={labelClass}>Search tags (up to {FREE_ONBOARD_SEARCH_TAGS_MAX})</p>
        <p className={helpClass}>
          Pick from our list — these power on-site discovery. Prefer specific tags like pizza,
          seafood, or waterfront instead of broad ones like restaurant. Do not tag location — town
          is selected separately above.
        </p>
        {categorySuggestedTags.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              Suggested for this category
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {categorySuggestedTags.map((tag) => {
                const selected = selectedTags.includes(tag.slug);
                const addDisabled = !selected && atTagCap;
                return (
                  <li key={tag.slug}>
                    <button
                      type="button"
                      disabled={addDisabled}
                      onClick={() => toggleCategorySuggestedTag(tag.slug)}
                      aria-pressed={selected}
                      title={
                        selected
                          ? `Remove ${tag.label}`
                          : addDisabled
                            ? `Tag limit reached (${FREE_ONBOARD_SEARCH_TAGS_MAX})`
                            : `Add ${tag.label}`
                      }
                      className={
                        selected
                          ? "inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 py-1 pl-2.5 pr-2 text-xs font-medium text-[var(--color-primary)]"
                          : "inline-flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 pl-2.5 pr-2 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      }
                    >
                      <span>{tag.label}</span>
                      <span aria-hidden className="text-[0.7rem] leading-none">
                        {selected ? "✓" : "+"}
                      </span>
                      <span className="sr-only">
                        {selected ? "Selected — click to remove" : "Add tag"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        <div className="mt-2">
          <FacetTypeaheadMultiSelect
            options={tagOptions}
            selectedSlugs={selectedTags}
            suggestedLabels={suggestedTags}
            maxSelected={FREE_ONBOARD_SEARCH_TAGS_MAX}
            onChange={(slugs) => {
              if (slugs.length + suggestedTags.length > FREE_ONBOARD_SEARCH_TAGS_MAX) return;
              setSelectedTags(slugs);
            }}
            onSuggestedChange={(labels) => {
              if (selectedTags.length + labels.length > FREE_ONBOARD_SEARCH_TAGS_MAX) return;
              setSuggestedTags(labels);
            }}
            placeholder="Search tags…"
            emptyMessage="No matching tags"
          />
        </div>
        <p className={`${helpClass} mt-1`}>
          Can&apos;t find a tag? Type it and choose Suggest — our team reviews new tags before they
          go live.
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          {tagSlotsUsed}/{FREE_ONBOARD_SEARCH_TAGS_MAX} tags used
          {suggestedTags.length > 0
            ? ` (${selectedTags.length} from list, ${suggestedTags.length} suggested)`
            : null}
        </p>
      </div>

      {err ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {err}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
      >
        {pending ? "Sending…" : isUpdate ? "Submit update request" : "Submit listing request"}
      </button>

      <p className="text-sm text-[var(--color-text-secondary)]">
        Have questions or need help? Email{" "}
        <a
          className="font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
          href="mailto:business@whereto30a.com"
        >
          business@whereto30a.com
        </a>
        .
      </p>

      {isUpdate ? (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
          <span>Need this listing taken down instead?</span>
          <button
            type="button"
            onClick={() => {
              setRemovalErr(null);
              setRemovalOpen(true);
            }}
            className="underline underline-offset-2 hover:text-[var(--color-primary)]"
          >
            Delete my listing
          </button>
        </p>
      ) : null}

      {removalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!removalPending) setRemovalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="removal-dialog-title"
            className="relative w-full max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 shadow-lg sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={removalPending}
              onClick={() => setRemovalOpen(false)}
              className="absolute right-2.5 top-2.5 inline-flex size-10 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              aria-label="Close"
            >
              <span aria-hidden className="text-2xl leading-none">
                ×
              </span>
            </button>
            <h2
              id="removal-dialog-title"
              className="pr-10 font-headline text-lg font-semibold leading-snug text-[var(--color-text-primary)]"
            >
              Request listing removal
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              This sends a removal request to our team — your listing stays live until we approve
              it. We use your name and email to confirm you&apos;re authorized before taking it
              down.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass} htmlFor="removal_submitter_name">
                  Name
                </label>
                <input
                  id="removal_submitter_name"
                  value={removalName}
                  onChange={(e) => setRemovalName(e.target.value)}
                  required
                  autoComplete="name"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="removal_submitter_email">
                  Email
                </label>
                <input
                  id="removal_submitter_email"
                  type="email"
                  value={removalEmail}
                  onChange={(e) => setRemovalEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="removal_reason">
                  Reason for removal
                </label>
                <textarea
                  id="removal_reason"
                  value={removalReason}
                  onChange={(e) =>
                    setRemovalReason(e.target.value.slice(0, FREE_ONBOARD_REMOVAL_REASON_MAX))
                  }
                  required
                  rows={3}
                  maxLength={FREE_ONBOARD_REMOVAL_REASON_MAX}
                  placeholder="e.g. Business closed, duplicate listing, wrong business…"
                  className={`${inputClass} mt-1.5`}
                />
                <CharCount value={removalReason} max={FREE_ONBOARD_REMOVAL_REASON_MAX} />
              </div>
            </div>
            {removalErr ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
                {removalErr}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={removalPending}
                onClick={() => void submitRemoval()}
                className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {removalPending ? "Sending…" : "Confirm removal request"}
              </button>
              <button
                type="button"
                disabled={removalPending}
                onClick={() => setRemovalOpen(false)}
                className="rounded-xl border border-[var(--color-border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
