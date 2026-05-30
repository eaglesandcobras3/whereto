"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BusinessResultsArtifactView } from "@/components/ask/BusinessResultsArtifact";
import { GuideResultsArtifactView } from "@/components/ask/GuideResultsArtifact";
import { TownResultsArtifactView } from "@/components/ask/TownResultsArtifact";
import { AreaResultsArtifactView } from "@/components/ask/AreaResultsArtifact";
import type { AskArtifact } from "@/lib/ask/types";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  summaryText: string;
  artifact: AskArtifact;
};

export function ArtifactShareView({ title, summaryText, artifact }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs uppercase tracking-wide text-primary">Shared from WhereTo30A Ask</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
      {summaryText ? (
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm text-muted-foreground">
          {summaryText}
        </pre>
      ) : null}
      <div className="mt-8">
        {artifact.type === "business_results" ? (
          <BusinessResultsArtifactView
            artifact={artifact}
            onSelectBusiness={() => {}}
            onReportBusiness={() => {}}
            onRemoveFilter={() => {}}
            onClearFilters={() => {}}
            onRefine={() => {}}
          />
        ) : artifact.type === "guide_results" ? (
          <GuideResultsArtifactView artifact={artifact} />
        ) : artifact.type === "town_results" ? (
          <TownResultsArtifactView artifact={artifact} />
        ) : artifact.type === "area_results" ? (
          <AreaResultsArtifactView artifact={artifact} />
        ) : (
          <p className="text-sm text-muted-foreground">
            This share link does not include a preview for this result type.
          </p>
        )}
      </div>
      <Link href="/ask" className={cn(buttonVariants({ variant: "outline" }), "mt-10")}>
        Ask your own question
      </Link>
    </div>
  );
}
