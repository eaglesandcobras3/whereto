"use client";

import { Map } from "lucide-react";
import type { AskArtifact, ActiveFilters } from "@/lib/ask/types";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { BusinessResultsArtifactView } from "@/components/ask/BusinessResultsArtifact";
import { GuideResultsArtifactView } from "@/components/ask/GuideResultsArtifact";
import { TownResultsArtifactView } from "@/components/ask/TownResultsArtifact";
import { AreaResultsArtifactView } from "@/components/ask/AreaResultsArtifact";
import { BusinessSubmissionArtifact } from "@/components/ask/BusinessSubmissionArtifact";
import { FeedbackArtifact } from "@/components/ask/FeedbackArtifact";
import { HumanHandoffArtifact } from "@/components/ask/HumanHandoffArtifact";
import { ShareArtifactButton } from "@/components/ask/ShareArtifactButton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type Props = {
  artifact: AskArtifact | undefined;
  artifactSessionId?: string;
  shareableSummary?: string;
  towns: ListBusinessTownOption[];
  onSelectBusiness: (id: string) => void;
  onReportBusiness: (id: string) => void;
  onRemoveFilter: (key: keyof ActiveFilters) => void;
  onClearFilters: () => void;
  onRefine: (message: string) => void;
  onStartOver: () => void;
};

export function ArtifactPanel({
  artifact,
  artifactSessionId,
  shareableSummary,
  towns,
  onSelectBusiness,
  onReportBusiness,
  onRemoveFilter,
  onClearFilters,
  onRefine,
  onStartOver,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-section text-foreground">Results</p>
        <Button variant="ghost" size="sm" type="button" onClick={onStartOver}>
          Start over
        </Button>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        {!artifact ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Map className="size-6" aria-hidden />
            </div>
            <p className="font-medium text-foreground">Your recommendations appear here</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Ask about places to eat, coffee, activities, or guides — we only show verified
              WhereTo30A listings.
            </p>
          </div>
        ) : artifact.type === "business_results" ? (
          <BusinessResultsArtifactView
            artifact={artifact}
            onSelectBusiness={onSelectBusiness}
            onReportBusiness={onReportBusiness}
            onRemoveFilter={onRemoveFilter}
            onClearFilters={onClearFilters}
            onRefine={onRefine}
          />
        ) : artifact.type === "guide_results" ? (
          <GuideResultsArtifactView artifact={artifact} />
        ) : artifact.type === "town_results" ? (
          <TownResultsArtifactView artifact={artifact} />
        ) : artifact.type === "area_results" ? (
          <AreaResultsArtifactView artifact={artifact} />
        ) : artifact.type === "business_submission_form" ? (
          <BusinessSubmissionArtifact towns={towns} />
        ) : artifact.type === "feedback_form" ? (
          <FeedbackArtifact artifact={artifact} />
        ) : artifact.type === "human_handoff_status" ? (
          <HumanHandoffArtifact artifact={artifact} />
        ) : (
          <div className="space-y-2">
            <h2 className="text-section text-foreground">{artifact.title}</h2>
            <p className="text-sm text-muted-foreground">{artifact.message}</p>
            {artifact.suggestions?.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {artifact.suggestions.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => onRefine(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </ScrollArea>
      {artifact ? (
        <>
          <Separator />
          <div className="px-4 py-3">
            <ShareArtifactButton
              artifact={artifact}
              artifactSessionId={artifactSessionId}
              shareableSummary={shareableSummary}
            />
          </div>
        </>
      ) : null}
    </aside>
  );
}
