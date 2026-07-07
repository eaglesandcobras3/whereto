"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { BusinessFeedbackForm } from "@/components/feedback/BusinessFeedbackForm";

function firstParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key)?.trim();
  return value ? value : undefined;
}

function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("..") || path.includes("//")) return false;
  if (/^\/\/|^https?:/i.test(path)) return false;
  return path.length <= 400;
}

function buildPrefilledListingContext(searchParams: URLSearchParams): string | undefined {
  const titleOnly = firstParam(searchParams, "title")?.slice(0, 200);
  let path: string | undefined;

  const p = firstParam(searchParams, "p") ?? firstParam(searchParams, "about") ?? firstParam(searchParams, "ref");
  if (p) {
    path = p.startsWith("/") ? p : `/${p}`;
  } else if (firstParam(searchParams, "business")) {
    path = `/business/${encodeURIComponent(firstParam(searchParams, "business")!)}`;
  } else if (firstParam(searchParams, "town")) {
    path = `/${encodeURIComponent(firstParam(searchParams, "town")!)}`;
  } else if (firstParam(searchParams, "guide")) {
    path = `/guide/${encodeURIComponent(firstParam(searchParams, "guide")!)}`;
  } else if (firstParam(searchParams, "area")) {
    path = `/area/${encodeURIComponent(firstParam(searchParams, "area")!)}`;
  }

  if (!path) return titleOnly;
  if (!isSafeInternalPath(path)) return titleOnly;

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin.replace(/\/$/, "")
      : "";
  const urlLine = origin ? `${origin}${path}` : path;
  return titleOnly ? `${titleOnly}: ${urlLine}` : urlLine;
}

export function FeedbackPrefillShell() {
  const searchParams = useSearchParams();
  const prefilled = useMemo(
    () => buildPrefilledListingContext(searchParams),
    [searchParams],
  );

  return (
    <>
      {prefilled ? (
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          To save you typing, we&apos;ll start the &quot;listing link&quot; field with{" "}
          <span className="text-[var(--color-text-primary)]">{prefilled}</span>. Feel free to edit it before you send.
        </p>
      ) : null}
      <BusinessFeedbackForm initialListingContext={prefilled} />
    </>
  );
}
