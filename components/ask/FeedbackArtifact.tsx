"use client";

import { BusinessFeedbackForm } from "@/components/feedback/BusinessFeedbackForm";
import { Separator } from "@/components/ui/separator";
import type { FeedbackFormArtifact } from "@/lib/ask/types";

type Props = {
  artifact: FeedbackFormArtifact;
};

export function FeedbackArtifact({ artifact }: Props) {
  const prefilled =
    artifact.listingContext ??
    (artifact.businessId ? `Business ID: ${artifact.businessId}` : undefined);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-section text-foreground">Listing feedback</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what needs updating. We route every submission to our team.
        </p>
      </div>
      <Separator />
      <BusinessFeedbackForm initialListingContext={prefilled} />
    </div>
  );
}
