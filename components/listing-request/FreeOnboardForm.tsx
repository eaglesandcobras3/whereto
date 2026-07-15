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
  FREE_ONBOARD_TITLE_MAX,
} from "@/lib/listing-requests/free-onboard-schema";

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";
const helpClass = "mt-1 text-xs text-[var(--color-text-tertiary)]";

type CategoryOption = { id: string; title: string; slug: string };
type LocationRow = { key: string; town_id: string; address: string };
type Presence = "storefront" | "service" | "";

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
  const [categoryId, setCategoryId] = useState("");
  const [presence, setPresence] = useState<Presence>("");
  const [searchKeywords, setSearchKeywords] = useState("");

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
        // Prefer physical when both were historically true; exclusive choice in the UI.
        if (b.is_storefront) setPresence("storefront");
        else if (b.is_service_business) setPresence("service");
        setLocations([
          {
            key: newLocationKey(),
            town_id: b.town_id ?? "",
            address: b.address ?? "",
          },
        ]);
        // Do not prefill existing SEO keywords on update.
        setSearchKeywords("");
      } catch (e) {
        if (controller.signal.aborted) return;
        setErr(e instanceof Error ? e.message : "Could not load listing");
      }
    })();
    return () => controller.abort();
  }, [businessSlug]);

  const tagOptions: DiscoverSearchTagOption[] = useMemo(() => {
    const set = new Set(searchTagOptions);
    for (const t of selectedTags) set.add(t);
    return Array.from(set)
      .sort()
      .map((slug) => ({ slug, label: formatSearchTagLabel(slug) }));
  }, [searchTagOptions, selectedTags]);

  function setPresenceExclusive(next: Presence) {
    setPresence(next);
    if (next === "storefront" && locations.length === 0) {
      setLocations([{ key: newLocationKey(), town_id: "", address: "" }]);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErr(null);

    if (!presence) {
      setPending(false);
      setErr("Select whether you have a physical location or operate as a service business.");
      return;
    }

    const isStorefront = presence === "storefront";
    const isService = presence === "service";
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
      submitter_name: String(fd.get("submitter_name") ?? ""),
      submitter_email: String(fd.get("submitter_email") ?? ""),
      title: title.trim(),
      is_storefront: isStorefront,
      is_service_business: isService,
      locations: locationPayload,
      website: String(fd.get("website") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      excerpt: excerpt.trim(),
      overview: overview.trim(),
      category_id: categoryId,
      search_tags: selectedTags,
      search_keywords: searchKeywords,
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

  const showLocations = presence === "storefront";

  return (
    <form onSubmit={submit} className="not-prose mt-10 space-y-6">
      {isUpdate ? (
        <p className="-mt-2 text-sm text-[var(--color-text-secondary)]">
          Suggest updates for this listing. Our team reviews every request before anything goes live.
        </p>
      ) : null}

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

      <label className="flex w-full cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="marketing_opt_in"
          className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--color-border-strong)]"
        />
        <span>Yes, send me marketing emails about WhereTo30A for business owners.</span>
      </label>

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
        <legend className={`${labelClass} px-1`}>Do customers visit your business location?</legend>
        <p className="text-xs text-[var(--color-text-tertiary)]">Choose one.</p>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="radio"
            name="presence"
            checked={presence === "storefront"}
            onChange={() => setPresenceExclusive("storefront")}
            className="mt-1 h-4 w-4 border-[var(--color-border-strong)]"
          />
          <span>Yes, customers visit our physical location</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="radio"
            name="presence"
            checked={presence === "service"}
            onChange={() => setPresenceExclusive("service")}
            className="mt-1 h-4 w-4 border-[var(--color-border-strong)]"
          />
          <span>No, we provide services at customers&apos; locations or by appointment</span>
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
              Include additional location
            </button>
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
          These tags help people discover your business in search. Use specific keywords like pizza,
          seafood, or happy hour instead of broad terms like restaurant.
        </p>
        <div className="mt-2">
          <FacetTypeaheadMultiSelect
            options={tagOptions}
            selectedSlugs={selectedTags}
            onChange={(slugs) => {
              if (slugs.length > FREE_ONBOARD_SEARCH_TAGS_MAX) return;
              setSelectedTags(slugs);
            }}
            placeholder="Search tags…"
            emptyMessage="No matching tags"
          />
        </div>
        <p className={helpClass}>
          {selectedTags.length}/{FREE_ONBOARD_SEARCH_TAGS_MAX} selected
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="search_keywords">
          SEO keywords
        </label>
        <input
          id="search_keywords"
          name="search_keywords"
          value={searchKeywords}
          onChange={(e) => setSearchKeywords(e.target.value)}
          className={`${inputClass} mt-1.5`}
          placeholder="Comma-separated phrases"
        />
        <p className={helpClass}>
          These keywords help search engines like Google understand your business. Enter
          comma-separated search phrases, such as pizza restaurant in Rosemary Beach, best seafood on
          30A, or gluten-free restaurant near Seaside.
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
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              aria-label="Close"
            >
              <span aria-hidden className="text-lg leading-none">
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
