"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  type ListBusinessTownOption,
} from "@/components/listing-request/ListBusinessForm";
import { FreeOnboardForm } from "@/components/listing-request/FreeOnboardForm";
import { resolveListBusinessMode } from "@/lib/listing-requests/list-business-mode";
import { fetchPublicTowns } from "@/lib/public/fetch-public-towns-client";

export function ListYourBusinessClient() {
  const searchParams = useSearchParams();
  const businessSlug = searchParams.get("business")?.trim() || null;
  const mode = resolveListBusinessMode({
    business: businessSlug,
    new: searchParams.get("new"),
  });
  const [towns, setTowns] = useState<ListBusinessTownOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicTowns(controller.signal)
      .then((rows) => {
        setTowns(rows);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setTowns([]);
        setError(err instanceof Error ? err.message : "Could not load towns");
      });

    return () => controller.abort();
  }, []);

  if (towns === null) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading form…</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100">
        {error}
      </p>
    );
  }

  if (towns.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Town directory is temporarily unavailable. Please try again later or email{" "}
        <a
          className="font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
          href="mailto:business@whereto30a.com"
        >
          business@whereto30a.com
        </a>
        .
      </p>
    );
  }

  return <FreeOnboardForm towns={towns} mode={mode} businessSlug={businessSlug} />;
}
