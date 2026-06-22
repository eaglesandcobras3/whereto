"use client";

import Link from "next/link";
import { ListBusinessForm, type ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { Separator } from "@/components/ui/separator";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isOnboardEnabled } from "@/lib/feature-flags-core";

type Props = {
  towns: ListBusinessTownOption[];
};

export function BusinessSubmissionArtifact({ towns }: Props) {
  const flags = useAppFeatureFlags();

  if (isOnboardEnabled(flags)) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-section text-foreground">List your business</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submissions go through the Business Portal so you can track review status.
          </p>
        </div>
        <Separator />
        <Link
          href="/portal/businesses/new"
          className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Open Business Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-section text-foreground">List your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Submissions are reviewed before anything goes live on WhereTo30A.
        </p>
      </div>
      <Separator />
      <ListBusinessForm towns={towns} />
    </div>
  );
}
