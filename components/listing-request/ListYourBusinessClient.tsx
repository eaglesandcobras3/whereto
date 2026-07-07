"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListBusinessForm,
  type ListBusinessTownOption,
} from "@/components/listing-request/ListBusinessForm";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isOnboardEnabled } from "@/lib/feature-flags-core";
import { fetchPublicTowns } from "@/lib/public/fetch-public-towns-client";

export function ListYourBusinessClient() {
  const router = useRouter();
  const flags = useAppFeatureFlags();
  const [towns, setTowns] = useState<ListBusinessTownOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOnboardEnabled(flags)) {
      router.replace("/portal/businesses/new");
      return;
    }

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
  }, [flags, router]);

  if (isOnboardEnabled(flags)) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">Redirecting to Business Portal…</p>
    );
  }

  if (towns === null) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading form…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (towns.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Town directory is temporarily unavailable. Please try again later or email{" "}
        <a
          className="font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
          href="mailto:hello@whereto30a.com"
        >
          hello@whereto30a.com
        </a>
        .
      </p>
    );
  }

  return <ListBusinessForm towns={towns} />;
}
