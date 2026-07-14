"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ListBusinessForm,
  type ListBusinessTownOption,
} from "@/components/listing-request/ListBusinessForm";
import { FreeOnboardForm } from "@/components/listing-request/FreeOnboardForm";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isFreeOnboardEnabled, isOnboardEnabled } from "@/lib/feature-flags-core";
import { fetchPublicTowns } from "@/lib/public/fetch-public-towns-client";

export function ListYourBusinessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessSlug = searchParams.get("business")?.trim() || null;
  const flags = useAppFeatureFlags();
  const freeOnboard = isFreeOnboardEnabled(flags);
  const onboard = isOnboardEnabled(flags);
  const [towns, setTowns] = useState<ListBusinessTownOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!freeOnboard && onboard) {
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
  }, [flags, router, freeOnboard, onboard]);

  if (!freeOnboard && onboard) {
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

  if (freeOnboard) {
    return <FreeOnboardForm towns={towns} businessSlug={businessSlug} />;
  }

  return <ListBusinessForm towns={towns} />;
}
