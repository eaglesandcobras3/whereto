"use client";

import { ChevronLeft, Map, X } from "lucide-react";
import type { AskArtifact, ActiveFilters } from "@/lib/ask/types";
import type { ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { artifactShortLabel } from "@/components/ask/artifact-label";
import { BusinessResultsArtifactView } from "@/components/ask/BusinessResultsArtifact";
import { GuideResultsArtifactView } from "@/components/ask/GuideResultsArtifact";
import { TownResultsArtifactView } from "@/components/ask/TownResultsArtifact";
import { AreaResultsArtifactView } from "@/components/ask/AreaResultsArtifact";
import { BusinessSubmissionArtifact } from "@/components/ask/BusinessSubmissionArtifact";
import { FeedbackArtifact } from "@/components/ask/FeedbackArtifact";
import { HumanHandoffArtifact } from "@/components/ask/HumanHandoffArtifact";
import { ClarificationFormArtifact } from "@/components/ask/ClarificationFormArtifact";
import { ShareArtifactButton } from "@/components/ask/ShareArtifactButton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  onClose?: () => void;
  className?: string;
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
  onClose,
  className,
}: Props) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-card", className)}>
      {onClose ? (
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="gap-1 px-2"
            onClick={onClose}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back
          </Button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-foreground">
            {artifact ? artifactShortLabel(artifact) : "Results"}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={onClose}
            aria-label="Close results"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-section text-foreground">Results</p>
          <Button variant="ghost" size="sm" type="button" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1 px-4 py-4">
        {!artifact ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Map className="size-6" aria-hidden />
            </div>
            <p className="font-medium text-foreground">Your recommendations appear here</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Ask about places to eat, coffee, activities, or guides. We only show verified
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
        ) : artifact.type === "clarification_form" ? (
          <ClarificationFormArtifact artifact={artifact} onSubmit={onRefine} />
        ) : (
          <div className="space-y-2">
            <h2 className="text-section text-foreground">{artifact.title}</h2>
            <p className="text-sm text-muted-foreground">{artifact.message}</p>
          </div>
        )}
      </ScrollArea>
      {artifact ? (
        <>
          <Separator />
          <div className="flex shrink-0 items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <ShareArtifactButton
              artifact={artifact}
              artifactSessionId={artifactSessionId}
              shareableSummary={shareableSummary}
            />
            {onClose ? (
              <Button variant="outline" size="sm" type="button" className="ml-auto" onClick={onStartOver}>
                Start over
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
