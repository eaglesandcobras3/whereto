"use client";

import { useEffect, useMemo, useState } from "react";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import {
  BusinessNameTypeahead,
  type BusinessSearchHit,
} from "@/components/listing-request/BusinessNameTypeahead";
import { CategoryTypeahead } from "@/components/listing-request/CategoryTypeahead";
import { SubmissionThankYou } from "@/components/listing-request/SubmissionThankYou";
import { FacetTypeaheadMultiSelect } from "@/components/discovery/FacetTypeaheadMultiSelect";
import { captureEvent } from "@/lib/analytics/gtag-runner";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";
import type { ListBusinessMode } from "@/lib/listing-requests/list-business-mode";
import {
  FREE_ONBOARD_EXCERPT_MAX,
  FREE_ONBOARD_LOCATIONS_MAX,
  FREE_ONBOARD_OVERVIEW_MAX,
  FREE_ONBOARD_PHOTOS_MAX,
  FREE_ONBOARD_REMOVAL_REASON_MAX,
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  FREE_ONBOARD_SUGGESTED_CATEGORY_MAX,
  FREE_ONBOARD_TITLE_MAX,
  formatFreeOnboardFieldErrors,
} from "@/lib/listing-requests/free-onboard-schema";
import { useBusinessPhotosFeatureEnabled } from "@/lib/feature-flags-client-utils";
import dynamic from "next/dynamic";

const MapLocationPickerClient = dynamic(
  () => import("@/components/maps/MapLocationPicker").then((m) => m.MapLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-tertiary)] sm:h-64">
        Loading map…
      </div>
    ),
  },
);

const inputClass =
  "w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const inputInvalidClass =
  "border-red-700 focus:border-red-700 focus:ring-red-700/20 dark:border-red-400 dark:focus:border-red-400";
const labelClass = "block text-sm font-medium text-[var(--color-text-secondary)]";
const helpClass = "mt-1 text-xs text-[var(--color-text-tertiary)]";
const formErrorAlertClass =
  "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100";
const fieldErrorClass = "mt-1.5 text-sm text-red-900 dark:text-red-100";

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className={fieldErrorClass} role="alert">
      {message}
    </p>
  );
}

function focusField(fieldKey: string) {
  const id =
    fieldKey === "is_storefront" || fieldKey === "is_service_business"
      ? "operate-fieldset"
      : fieldKey === "locations"
        ? "locations-section"
        : fieldKey === "search_tags" || fieldKey === "suggested_tags"
          ? "search-tags"
          : fieldKey;
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el && "focus" in el && typeof (el as HTMLElement).focus === "function") {
    (el as HTMLElement).focus({ preventScroll: true });
  }
}

type UploadedIntakePhoto = {
  public_url: string;
  storage_path: string;
};

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
type LocationRow = {
  key: string;
  town_id: string;
  address: string;
  map_lat: number | null;
  map_lng: number | null;
};

type PrefillBusiness = {
  id: string;
  title: string;
  slug: string;
  town_id: string | null;
  address: string | null;
  map_lat?: number | null;
  map_lng?: number | null;
  website: string | null;
  phone: string | null;
  excerpt: string | null;
  overview: string | null;
  is_storefront: boolean;
  is_service_business: boolean;
  category_id: string | null;
  /** Display title for the prefilled leaf category. */
  category_title?: string | null;
  /** Rollup/group title for the prefilled category. */
  category_group_title?: string | null;
  /** @deprecated Not used for unified category prefill. */
  service_category_id?: string | null;
  search_tags: string[];
  main_image_url?: string | null;
};

type Props = {
  towns: ListBusinessTownOption[];
  /** Intake mode from URL (`find` = typeahead verify, `new` = blank, `slug` = prefill). */
  mode?: ListBusinessMode;
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

type FindPhase = "searching" | "selected" | "creating-new";

export function FreeOnboardForm({ towns, mode = "find", businessSlug }: Props) {
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
  const [findPhase, setFindPhase] = useState<FindPhase>(
    mode === "find" ? "searching" : mode === "slug" ? "selected" : "creating-new",
  );
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removalName, setRemovalName] = useState("");
  const [removalEmail, setRemovalEmail] = useState("");
  const [removalReason, setRemovalReason] = useState("");
  const [removalPending, setRemovalPending] = useState(false);
  const [removalErr, setRemovalErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [overview, setOverview] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [locations, setLocations] = useState<LocationRow[]>([
    { key: newLocationKey(), town_id: "", address: "", map_lat: null, map_lng: null },
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [prefillCategoryTitle, setPrefillCategoryTitle] = useState<string | null>(null);
  const [prefillCategoryGroupTitle, setPrefillCategoryGroupTitle] = useState<string | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState("");
  const [isStorefront, setIsStorefront] = useState(false);
  const [isService, setIsService] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  /** Prefill baseline — only send main_image_url when the admin changes the image. */
  const [initialMainImageUrl, setInitialMainImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageErr, setImageErr] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<UploadedIntakePhoto[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryErr, setGalleryErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const businessPhotosEnabled = useBusinessPhotosFeatureEnabled();

  function clearErrors() {
    setErr(null);
    setFieldErrors({});
  }

  function applyApiFieldErrors(
    apiFieldErrors: Record<string, string[] | undefined> | undefined,
    fallback?: string,
  ) {
    const next: Record<string, string> = {};
    for (const [key, msgs] of Object.entries(apiFieldErrors ?? {})) {
      const msg = msgs?.find((m) => typeof m === "string" && m.trim());
      if (msg) next[key] = msg;
    }
    setFieldErrors(next);
    setErr(formatFreeOnboardFieldErrors(apiFieldErrors) ?? fallback ?? "Something went wrong.");
    const firstKey = Object.keys(next)[0];
    if (firstKey) {
      requestAnimationFrame(() => focusField(firstKey));
    }
  }

  const isUpdate = Boolean(prefill?.id);
  const showTypeahead = mode === "find" && findPhase === "searching";
  const findDecisionNeeded = mode === "find" && findPhase === "searching";

  function applyPrefillBusiness(b: PrefillBusiness) {
    setPrefill(b);
    setTitle(b.title);
    setExcerpt((b.excerpt ?? "").slice(0, FREE_ONBOARD_EXCERPT_MAX));
    setOverview((b.overview ?? "").slice(0, FREE_ONBOARD_OVERVIEW_MAX));
    setWebsite(b.website ?? "");
    setPhone(b.phone ?? "");
    // Unified leaf only — never fall back to deprecated service_category_id.
    setCategoryId(b.category_id ?? "");
    setPrefillCategoryTitle(b.category_title?.trim() || null);
    setPrefillCategoryGroupTitle(b.category_group_title?.trim() || null);
    setSelectedTags((b.search_tags ?? []).slice(0, FREE_ONBOARD_SEARCH_TAGS_MAX));
    setSuggestedTags([]);
    setSuggestedCategory("");
    setIsStorefront(Boolean(b.is_storefront));
    setIsService(Boolean(b.is_service_business));
    setMainImageUrl(b.main_image_url ?? null);
    setInitialMainImageUrl(b.main_image_url ?? null);
    setLocations([
      {
        key: newLocationKey(),
        town_id: b.town_id ?? "",
        address: b.address ?? "",
        map_lat: b.map_lat ?? null,
        map_lng: b.map_lng ?? null,
      },
    ]);
    setFindPhase("selected");
  }

  function clearToSearch(keepTitle = false) {
    const kept = keepTitle ? title : "";
    setPrefill(null);
    setTitle(kept);
    setExcerpt("");
    setOverview("");
    setWebsite("");
    setPhone("");
    setCategoryId("");
    setPrefillCategoryTitle(null);
    setPrefillCategoryGroupTitle(null);
    setSelectedTags([]);
    setSuggestedTags([]);
    setSuggestedCategory("");
    setIsStorefront(false);
    setIsService(false);
    setLocations([{ key: newLocationKey(), town_id: "", address: "", map_lat: null, map_lng: null }]);
    setFindPhase("searching");
    clearErrors();
  }

  function blankForNewListing(name: string) {
    setPrefill(null);
    setTitle(name.slice(0, FREE_ONBOARD_TITLE_MAX));
    setExcerpt("");
    setOverview("");
    setWebsite("");
    setPhone("");
    setCategoryId("");
    setPrefillCategoryTitle(null);
    setPrefillCategoryGroupTitle(null);
    setSelectedTags([]);
    setSuggestedTags([]);
    setSuggestedCategory("");
    setIsStorefront(false);
    setIsService(false);
    setLocations([{ key: newLocationKey(), town_id: "", address: "", map_lat: null, map_lng: null }]);
    setFindPhase("creating-new");
    clearErrors();
  }

  async function loadPrefillBySlug(slug: string) {
    setPrefillLoading(true);
    clearErrors();
    try {
      const res = await fetch(
        `/api/listing-requests/prefill?slug=${encodeURIComponent(slug)}`,
      );
      const j = (await res.json()) as { business?: PrefillBusiness; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not load listing");
      if (!j.business) throw new Error("Could not load listing");
      applyPrefillBusiness(j.business);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load listing");
      if (mode === "find") setFindPhase("searching");
    } finally {
      setPrefillLoading(false);
    }
  }

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
    if (!businessSlug || mode !== "slug") return;
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
        if (controller.signal.aborted) return;
        applyPrefillBusiness(b);
      } catch (e) {
        if (controller.signal.aborted) return;
        setErr(e instanceof Error ? e.message : "Could not load listing");
      }
    })();
    return () => controller.abort();
  }, [businessSlug, mode]);

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

  const categoryTypeaheadOptions = useMemo(() => {
    const fromGroups =
      categoryGroups.length > 0
        ? categoryGroups.flatMap((g) =>
            g.leaves.map((c) => ({
              id: c.id,
              title: c.title,
              groupTitle: g.title,
            })),
          )
        : categories.map((c) => ({
            id: c.id,
            title: c.title,
            groupTitle: c.rollupTitle ?? null,
          }));

    // Prefill may reference a leaf that is unpublished/missing from form-options —
    // inject it so the typeahead can show the current category.
    if (
      categoryId &&
      prefillCategoryTitle &&
      !fromGroups.some((o) => o.id === categoryId)
    ) {
      return [
        ...fromGroups,
        {
          id: categoryId,
          title: prefillCategoryTitle,
          groupTitle: prefillCategoryGroupTitle,
        },
      ];
    }
    return fromGroups;
  }, [
    categoryGroups,
    categories,
    categoryId,
    prefillCategoryTitle,
    prefillCategoryGroupTitle,
  ]);

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
      setLocations([{ key: newLocationKey(), town_id: "", address: "", map_lat: null, map_lng: null }]);
    }
  }

  function setServiceChecked(checked: boolean) {
    setIsService(checked);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    clearErrors();

    if (findDecisionNeeded) {
      setPending(false);
      setErr("Select your existing listing from the search results, or choose Add as a new listing.");
      return;
    }

    if (!isStorefront && !isService) {
      setPending(false);
      setFieldErrors({
        is_storefront:
          "Select whether you have a physical location, operate as a service business, or both.",
      });
      setErr("How you operate: Select whether you have a physical location, operate as a service business, or both.");
      requestAnimationFrame(() => focusField("is_storefront"));
      return;
    }

    const suggestedCategoryTrimmed = suggestedCategory.trim().slice(0, FREE_ONBOARD_SUGGESTED_CATEGORY_MAX);
    if (!categoryId && !suggestedCategoryTrimmed) {
      setPending(false);
      setFieldErrors({
        category_id: "Choose a category or suggest one that is missing from the list.",
      });
      setErr("Category: Choose a category or suggest one that is missing from the list.");
      requestAnimationFrame(() => focusField("category_id"));
      return;
    }
    const locationPayload = isStorefront
      ? locations.map((l) => ({
          town_id: l.town_id,
          address: l.address,
          map_lat: l.map_lat,
          map_lng: l.map_lng,
        }))
      : [];

    if (isStorefront && locationPayload.some((l) => !l.town_id)) {
      setPending(false);
      setFieldErrors({ locations: "Choose a town for each location." });
      setErr("Locations: Choose a town for each location.");
      requestAnimationFrame(() => focusField("locations"));
      return;
    }

    const excerptTrimmed = excerpt.trim();
    const overviewTrimmed = overview.trim();
    if (excerptTrimmed.length < 10) {
      setPending(false);
      setFieldErrors({ excerpt: "Write a short headline (at least 10 characters)." });
      setErr("Headline / summary: Write a short headline (at least 10 characters).");
      requestAnimationFrame(() => focusField("excerpt"));
      return;
    }
    if (overviewTrimmed.length < 15) {
      setPending(false);
      setFieldErrors({ overview: "Write a short overview (at least 15 characters)." });
      setErr("Overview description: Write a short overview (at least 15 characters).");
      requestAnimationFrame(() => focusField("overview"));
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
      website: website.trim(),
      phone: phone.trim(),
      excerpt: excerptTrimmed,
      overview: overviewTrimmed,
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
      target_business_slug: prefill?.slug ?? (mode === "slug" ? businessSlug : null) ?? null,
      ...(isAdmin &&
      businessPhotosEnabled &&
      mainImageUrl !== initialMainImageUrl
        ? { main_image_url: mainImageUrl }
        : {}),
      ...(businessPhotosEnabled && galleryPhotos.length > 0
        ? {
            photos: galleryPhotos.map((p) => ({
              public_url: p.public_url,
              storage_path: p.storage_path,
              include: true,
            })),
          }
        : {}),
    };

    if (selectedTags.length + payload.suggested_tags.length > FREE_ONBOARD_SEARCH_TAGS_MAX) {
      setPending(false);
      setFieldErrors({
        suggested_tags: `Choose at most ${FREE_ONBOARD_SEARCH_TAGS_MAX} tags total across search tags and suggested tags.`,
      });
      setErr(
        `Search tags: Choose at most ${FREE_ONBOARD_SEARCH_TAGS_MAX} tags total across search tags and suggested tags.`,
      );
      requestAnimationFrame(() => focusField("suggested_tags"));
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
      applyApiFieldErrors(j.fieldErrors, j.error ?? "Something went wrong.");
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
      setRemovalErr(
        formatFreeOnboardFieldErrors(j.fieldErrors) ?? j.error ?? "Something went wrong.",
      );
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
        {mode === "find" && findPhase === "selected" && prefill ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]/50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Verifying: {prefill.title}
              </p>
              <p className={helpClass}>
                We loaded your current listing details below. Confirm or edit anything that needs a
                refresh, then submit to earn your verified badge.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
              onClick={() => clearToSearch(true)}
            >
              Change
            </button>
          </div>
        ) : null}
        {mode === "find" && findPhase === "creating-new" ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]/50 px-3 py-2.5">
            <p className="min-w-0 flex-1 text-sm text-[var(--color-text-secondary)]">
              Creating a new listing. You can still search if this business already exists.
            </p>
            <button
              type="button"
              className="shrink-0 text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
              onClick={() => clearToSearch(true)}
            >
              Search existing
            </button>
          </div>
        ) : null}
        {showTypeahead ? (
          <>
            <BusinessNameTypeahead
              value={title}
              maxLength={FREE_ONBOARD_TITLE_MAX}
              inputClassName={inputClass}
              disabled={prefillLoading}
              onQueryChange={setTitle}
              onSelectBusiness={(hit: BusinessSearchHit) => {
                setTitle(hit.title);
                void loadPrefillBySlug(hit.slug);
              }}
              onAddNew={(name) => blankForNewListing(name)}
            />
            <p className={helpClass}>
              {prefillLoading
                ? "Loading listing…"
                : "Search for your listing to verify it, or add as new if it is not found."}
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {!findDecisionNeeded ? (
        <>
      {isAdmin && businessPhotosEnabled ? (
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4">
          <div>
            <p className={labelClass}>Main listing image (admin)</p>
            <p className={helpClass}>
              Used on discovery cards. Upload is resized to max 1600px and saved as WebP. Only sent
              when you change or remove the image; applied when the request is approved.
            </p>
          </div>
          {mainImageUrl ? (
            <div className="flex flex-wrap items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mainImageUrl}
                alt="Listing preview"
                className="h-28 w-40 rounded-lg object-cover"
              />
              <button
                type="button"
                className="text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
                onClick={() => setMainImageUrl(null)}
              >
                Remove image
              </button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            disabled={imageUploading}
            className="block w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void (async () => {
                setImageErr(null);
                setImageUploading(true);
                try {
                  const body = new FormData();
                  body.set("file", file);
                  body.set("folder", "free-onboard");
                  const res = await fetch("/api/admin/media/upload", {
                    method: "POST",
                    body,
                  });
                  const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
                  if (!res.ok || !j.url) {
                    throw new Error(j.error ?? "Upload failed");
                  }
                  setMainImageUrl(j.url);
                } catch (err) {
                  setImageErr(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setImageUploading(false);
                }
              })();
            }}
          />
          {imageUploading ? <p className={helpClass}>Uploading…</p> : null}
          {imageErr ? <p className={`${fieldErrorClass}`} role="alert">{imageErr}</p> : null}
        </div>
      ) : null}

      <fieldset
        id="operate-fieldset"
        tabIndex={-1}
        className={`space-y-2 rounded-xl border bg-[var(--color-surface-secondary)]/40 p-4 outline-none ${
          fieldErrors.is_storefront || fieldErrors.is_service_business
            ? "border-red-700 dark:border-red-400"
            : "border-[var(--color-border)]"
        }`}
      >
        <legend className={`${labelClass} px-1`}>How do customers work with you?</legend>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Select all that apply — some businesses are both a storefront and a service provider.
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isStorefront}
            onChange={(e) => {
              setStorefrontChecked(e.target.checked);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.is_storefront;
                delete next.is_service_business;
                return next;
              });
            }}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>Customers visit our physical location (storefront)</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isService}
            onChange={(e) => {
              setServiceChecked(e.target.checked);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.is_storefront;
                delete next.is_service_business;
                return next;
              });
            }}
            className="mt-1 h-4 w-4 rounded border-[var(--color-border-strong)]"
          />
          <span>We provide services at customers&apos; locations or by appointment</span>
        </label>
        <FieldError message={fieldErrors.is_storefront ?? fieldErrors.is_service_business} />
      </fieldset>

      {showLocations ? (
        <div id="locations-section" className="space-y-4" tabIndex={-1}>
          <div>
            <p className={labelClass}>Locations</p>
            <p className={helpClass}>Select town and provide address for each location</p>
            <FieldError message={fieldErrors.locations} />
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
              <div>
                <p className={labelClass}>Map pin</p>
                <MapLocationPickerClient
                  lat={loc.map_lat}
                  lng={loc.map_lng}
                  onChange={(map_lat, map_lng) =>
                    setLocations((prev) =>
                      prev.map((l) => (l.key === loc.key ? { ...l, map_lat, map_lng } : l)),
                    )
                  }
                  className="mt-1.5"
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
                    { key: newLocationKey(), town_id: "", address: "", map_lat: null, map_lng: null },
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
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value);
              setFieldErrors((prev) => {
                if (!prev.website) return prev;
                const next = { ...prev };
                delete next.website;
                return next;
              });
            }}
            placeholder="example.com"
            aria-invalid={Boolean(fieldErrors.website)}
            className={`${inputClass} mt-1.5 ${fieldErrors.website ? inputInvalidClass : ""}`}
          />
          <FieldError message={fieldErrors.website} />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            name="phone"
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFieldErrors((prev) => {
                if (!prev.phone) return prev;
                const next = { ...prev };
                delete next.phone;
                return next;
              });
            }}
            aria-invalid={Boolean(fieldErrors.phone)}
            className={`${inputClass} mt-1.5 ${fieldErrors.phone ? inputInvalidClass : ""}`}
          />
          <FieldError message={fieldErrors.phone} />
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
          minLength={10}
          maxLength={FREE_ONBOARD_EXCERPT_MAX}
          value={excerpt}
          onChange={(e) => {
            setExcerpt(e.target.value);
            setFieldErrors((prev) => {
              if (!prev.excerpt) return prev;
              const next = { ...prev };
              delete next.excerpt;
              return next;
            });
          }}
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby="excerpt-hint"
          className={`${inputClass} mt-1.5 ${fieldErrors.excerpt ? inputInvalidClass : ""}`}
          placeholder="One short line that captures the business."
        />
        <p id="excerpt-hint" className={helpClass}>
          At least 10 characters.
        </p>
        <CharCount value={excerpt} max={FREE_ONBOARD_EXCERPT_MAX} />
        <FieldError message={fieldErrors.excerpt} />
      </div>

      <div>
        <label className={labelClass} htmlFor="overview">
          Overview description
        </label>
        <textarea
          id="overview"
          required
          rows={4}
          minLength={15}
          maxLength={FREE_ONBOARD_OVERVIEW_MAX}
          value={overview}
          onChange={(e) => {
            setOverview(e.target.value);
            setFieldErrors((prev) => {
              if (!prev.overview) return prev;
              const next = { ...prev };
              delete next.overview;
              return next;
            });
          }}
          aria-invalid={Boolean(fieldErrors.overview)}
          aria-describedby="overview-hint"
          className={`${inputClass} mt-1.5 ${fieldErrors.overview ? inputInvalidClass : ""}`}
          placeholder="A short overview visitors will read on the listing."
        />
        <p id="overview-hint" className={helpClass}>
          At least 15 characters.
        </p>
        <CharCount value={overview} max={FREE_ONBOARD_OVERVIEW_MAX} />
        <FieldError message={fieldErrors.overview} />
      </div>

      {businessPhotosEnabled ? (
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 p-4">
          <div>
            <p className={labelClass}>Photos (optional)</p>
            <p className={helpClass}>
              Add up to {FREE_ONBOARD_PHOTOS_MAX} photos of your place. They go to our review queue —
              we&apos;ll choose which ones to publish. Images are resized and saved as WebP.
            </p>
          </div>
          {galleryPhotos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {galleryPhotos.map((photo) => (
                <li key={photo.storage_path} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.public_url}
                    alt=""
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-zinc-800 shadow-sm"
                    onClick={() =>
                      setGalleryPhotos((prev) =>
                        prev.filter((p) => p.storage_path !== photo.storage_path),
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {galleryPhotos.length < FREE_ONBOARD_PHOTOS_MAX ? (
            <input
              type="file"
              accept="image/*"
              disabled={galleryUploading}
              className="block w-full text-sm text-[var(--color-text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void (async () => {
                  setGalleryErr(null);
                  setGalleryUploading(true);
                  try {
                    const body = new FormData();
                    body.set("file", file);
                    const res = await fetch("/api/listing-requests/photos", {
                      method: "POST",
                      body,
                    });
                    const j = (await res.json()) as {
                      ok?: boolean;
                      public_url?: string;
                      storage_path?: string;
                      error?: string;
                    };
                    if (!res.ok || !j.public_url || !j.storage_path) {
                      throw new Error(j.error ?? "Upload failed");
                    }
                    setGalleryPhotos((prev) => {
                      if (prev.length >= FREE_ONBOARD_PHOTOS_MAX) return prev;
                      if (prev.some((p) => p.storage_path === j.storage_path)) return prev;
                      return [
                        ...prev,
                        { public_url: j.public_url!, storage_path: j.storage_path! },
                      ];
                    });
                  } catch (err) {
                    setGalleryErr(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setGalleryUploading(false);
                  }
                })();
              }}
            />
          ) : (
            <p className={helpClass}>Photo limit reached ({FREE_ONBOARD_PHOTOS_MAX}).</p>
          )}
          {galleryUploading ? <p className={helpClass}>Uploading…</p> : null}
          {galleryErr ? <p className={fieldErrorClass} role="alert">{galleryErr}</p> : null}
        </div>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="category_id">
          Category
        </label>
        <p className={helpClass}>
          Search for the closest fit. If yours isn&apos;t listed, choose Suggest — we review new
          categories before they go live.
        </p>
        <CategoryTypeahead
          id="category_id"
          options={categoryTypeaheadOptions}
          value={categoryId}
          suggestedValue={suggestedCategory}
          fallbackLabel={prefillCategoryTitle}
          fallbackGroupTitle={prefillCategoryGroupTitle}
          disabled={!isStorefront && !isService}
          inputClassName={`${inputClass}${
            fieldErrors.category_id || fieldErrors.suggested_category ? ` ${inputInvalidClass}` : ""
          }`}
          placeholder={
            isStorefront || isService
              ? "Search categories…"
              : "Select how customers work with you first"
          }
          onChange={(id) => {
            setCategoryId(id);
            setPrefillCategoryTitle(null);
            setPrefillCategoryGroupTitle(null);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.category_id;
              delete next.suggested_category;
              return next;
            });
          }}
          onSuggestedChange={(value) => {
            setSuggestedCategory(value);
            setPrefillCategoryTitle(null);
            setPrefillCategoryGroupTitle(null);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.category_id;
              delete next.suggested_category;
              return next;
            });
          }}
        />
        <FieldError message={fieldErrors.category_id ?? fieldErrors.suggested_category} />
      </div>

      <div id="search-tags" tabIndex={-1}>
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
        <FieldError message={fieldErrors.search_tags ?? fieldErrors.suggested_tags} />
      </div>

      {err ? (
        <div className={formErrorAlertClass} role="alert">
          {err}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || prefillLoading}
        className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-light)] disabled:opacity-50"
      >
        {pending ? "Sending…" : isUpdate ? "Submit verification" : "Submit listing request"}
      </button>
        </>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Select a matching listing above, or choose{" "}
          <span className="font-medium">Add as a new listing</span> to continue.
        </p>
      )}

      {err && findDecisionNeeded ? (
        <div className={formErrorAlertClass} role="alert">
          {err}
        </div>
      ) : null}

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
              <div className={`mt-3 ${formErrorAlertClass}`} role="alert">
                {removalErr}
              </div>
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
