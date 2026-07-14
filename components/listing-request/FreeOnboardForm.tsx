"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { SubmissionThankYou } from "@/components/listing-request/SubmissionThankYou";
import { captureEvent } from "@/lib/analytics/gtag-runner";
import {
  FREE_ONBOARD_EXCERPT_MAX,
  FREE_ONBOARD_LOCATIONS_MAX,
  FREE_ONBOARD_OVERVIEW_MAX,
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  FREE_ONBOARD_TITLE_MAX,
} from "@/lib/listing-requests/free-onboard-schema";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";
const helpClass = "mt-1 text-xs text-[var(--color-text-tertiary)]";

type CategoryOption = { id: string; title: string; slug: string };
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
  search_tags: string[];
  search_keywords: string | null;
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
  const [searchTagOptions, setSearchTagOptions] = useState<string[]>([]);
  const [prefill, setPrefill] = useState<PrefillBusiness | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removalName, setRemovalName] = useState("");
  const [removalEmail, setRemovalEmail] = useState("");
  const [removalPending, setRemovalPending] = useState(false);
  const [removalErr, setRemovalErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [overview, setOverview] = useState("");
  const [locations, setLocations] = useState<LocationRow[]>([
    { key: newLocationKey(), town_id: "", address: "" },
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [isStorefront, setIsStorefront] = useState(false);
  const [isService, setIsService] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/listing-requests/form-options", {
          signal: controller.signal,
        });
        const j = (await res.json()) as {
          categories?: CategoryOption[];
          searchTags?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Could not load form options");
        setCategories(j.categories ?? []);
        setSearchTagOptions(j.searchTags ?? []);
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
        setCategoryId(b.category_id ?? "");
        setSelectedTags((b.search_tags ?? []).slice(0, FREE_ONBOARD_SEARCH_TAGS_MAX));
        setIsStorefront(b.is_storefront);
        setIsService(b.is_service_business);
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

  const tagChoices = useMemo(() => {
    const set = new Set(searchTagOptions);
    for (const t of selectedTags) set.add(t);
    return Array.from(set).sort();
  }, [searchTagOptions, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= FREE_ONBOARD_SEARCH_TAGS_MAX) return prev;
      return [...prev, tag];
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      _hp_company_website: String(fd.get("_hp_company_website") ?? ""),
      submitter_name: String(fd.get("submitter_name") ?? ""),
      submitter_email: String(fd.get("submitter_email") ?? ""),
      title: title.trim(),
      is_storefront: isStorefront,
      is_service_business: isService,
      locations: locations.map((l) => ({
        town_id: l.town_id,
        address: l.address,
      })),
      website: String(fd.get("website") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      excerpt: excerpt.trim(),
      overview: overview.trim(),
      category_id: categoryId,
      search_tags: selectedTags,
      search_keywords: String(fd.get("search_keywords") ?? ""),
      marketing_opt_in: fd.get("marketing_opt_in") === "on",
      target_business_id: prefill?.id ?? null,
      target_business_slug: prefill?.slug ?? businessSlug ?? null,
    };

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
    if (!name || !email) {
      setRemovalErr("Name and email are required so we can confirm ownership.");
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
      <div className="mt-10 space-y-6">
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
    return <p className="mt-8 text-sm text-[var(--color-text-secondary)]">Loading form…</p>;
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-6">
      <p className="-mt-2 text-sm text-[var(--color-text-secondary)]">
        {isUpdate
          ? "Suggest updates for this listing. Our team reviews every request before anything goes live."
          : "Submit once for every location you operate. Each town/address becomes its own listing after review. Slug and SEO title/description are generated for you."}
      </p>

      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="_hp_company_website">Company website</label>
        <input id="_hp_company_website" name="_hp_company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
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
      </div>

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
        <legend className={`${labelClass} px-1`}>Physical location or service business</legend>
        <p className="text-xs text-[var(--color-text-tertiary)]">Select all that apply.</p>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isStorefront}
            onChange={(e) => setIsStorefront(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>Physical location / storefront customers visit</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isService}
            onChange={(e) => setIsService(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>Service business (mobile, appointment, or regional)</span>
        </label>
      </fieldset>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={labelClass}>Locations</p>
            <p className={helpClass}>
              Add each town and address. One form can create multiple listings after approval.
            </p>
          </div>
          {locations.length < FREE_ONBOARD_LOCATIONS_MAX ? (
            <button
              type="button"
              className="text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
              onClick={() =>
                setLocations((prev) => [
                  ...prev,
                  { key: newLocationKey(), town_id: "", address: "" },
                ])
              }
            >
              Add location
            </button>
          ) : null}
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
      </div>

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
          <p className={helpClass}>http(s) optional — we add https when needed.</p>
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
          Excerpt — headline / summary
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
        <p className={helpClass}>Used for the listing teaser and SEO description.</p>
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
        <select
          id="category_id"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={`${inputClass} mt-1.5`}
        >
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className={labelClass}>Search tags (up to {FREE_ONBOARD_SEARCH_TAGS_MAX})</p>
        <p className={helpClass}>
          These show on the listing and power Discover / site search filters — pick the best matches.
        </p>
        <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[var(--color-border)] p-3">
          {tagChoices.map((tag) => {
            const on = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  on
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <p className={helpClass}>{selectedTags.length}/{FREE_ONBOARD_SEARCH_TAGS_MAX} selected</p>
      </div>

      <div>
        <label className={labelClass} htmlFor="search_keywords">
          Search keywords
        </label>
        <input
          id="search_keywords"
          name="search_keywords"
          defaultValue={prefill?.search_keywords ?? ""}
          className={`${inputClass} mt-1.5`}
          placeholder="Comma-separated phrases"
        />
        <p className={helpClass}>
          For SEO and keyword matching (not the same as the filter tags above).
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="marketing_opt_in"
          className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
        />
        <span>Yes, send me marketing emails about WhereTo30A for business owners.</span>
      </label>

      <p className="text-sm text-[var(--color-text-secondary)]">
        Have questions or need help?{" "}
        <a
          className="font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
          href="mailto:hello@whereto30a.com"
        >
          Email hello@whereto30a.com
        </a>
        .
      </p>

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

      {isUpdate ? (
        <div className="border-t border-[var(--color-border)] pt-6">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Need this listing taken down instead?
          </p>
          <button
            type="button"
            onClick={() => {
              setRemovalErr(null);
              setRemovalOpen(true);
            }}
            className="mt-2 text-sm font-medium text-red-700 underline-offset-2 hover:underline"
          >
            Delete my listing
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Already listed?{" "}
          <Link href="/feedback" className="underline-offset-2 hover:underline">
            Send feedback
          </Link>{" "}
          or open a listing and use Update this listing.
        </p>
      )}

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
            className="w-full max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="removal-dialog-title"
              className="font-headline text-lg font-semibold text-[var(--color-text-primary)]"
            >
              Request listing removal
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              This sends a removal request to our team — your listing stays live until we approve
              it. We use your name and email to confirm you&apos;re authorized before taking it
              down.
            </p>
            <div className="mt-4 space-y-4">
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
            </div>
            {removalErr ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
                {removalErr}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
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
