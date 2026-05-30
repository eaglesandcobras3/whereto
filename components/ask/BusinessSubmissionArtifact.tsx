"use client";

import { ListBusinessForm, type ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { Separator } from "@/components/ui/separator";

type Props = {
  towns: ListBusinessTownOption[];
};

export function BusinessSubmissionArtifact({ towns }: Props) {
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
