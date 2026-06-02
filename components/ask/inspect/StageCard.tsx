"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Loader2, SkipForward } from "lucide-react";

export type StageStatus = "pending" | "running" | "awaiting" | "done" | "skipped";

type Props = {
  index: number;
  heading: string;
  status: StageStatus;
  summary?: string | null;
  children?: React.ReactNode;
  approveLabel?: string | null;
  skipLabel?: string | null;
  onApprove?: () => void;
  onSkip?: () => void;
  /** When true, stage body stays visible after done/skipped (inspector debug). */
  persistContent?: boolean;
};

export function StageCard({
  index,
  heading,
  status,
  summary,
  children,
  approveLabel,
  skipLabel,
  onApprove,
  onSkip,
  persistContent = false,
}: Props) {
  const isDone = status === "done" || status === "skipped";
  const isRunning = status === "running";
  const isExpanded = persistContent || !isDone;

  return (
    <div
      className={cn(
        "relative rounded-2xl border transition-all duration-300",
        isDone && "border-border bg-card opacity-75",
        isRunning && "border-primary/30 bg-card shadow-md ring-1 ring-primary/20",
        status === "awaiting" && "border-primary/40 bg-card shadow-md ring-1 ring-primary/25",
        status === "pending" && "border-border/50 bg-muted/30",
      )}
    >
      <div className="flex items-start gap-4 p-5">
        <StageIndicator index={index} status={status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={cn(
                "font-semibold leading-snug",
                isDone ? "text-sm text-muted-foreground" : "text-base text-foreground",
              )}
            >
              {heading}
            </h3>
            {status === "skipped" && (
              <span className="text-xs text-muted-foreground">skipped</span>
            )}
          </div>

          {isDone && summary ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
          ) : null}

          {isExpanded && children ? (
            <div className="mt-4 space-y-4">{children}</div>
          ) : null}

          {isExpanded && (approveLabel || skipLabel) ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {approveLabel && onApprove ? (
                <Button
                  onClick={onApprove}
                  disabled={isRunning}
                  size="sm"
                  className="rounded-full px-5"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                      Working…
                    </>
                  ) : (
                    approveLabel
                  )}
                </Button>
              ) : null}
              {skipLabel && onSkip && !isRunning ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="mr-1.5 size-3.5" />
                  {skipLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StageIndicator({ index, status }: { index: number; status: StageStatus }) {
  if (status === "done") {
    return <CheckCircle className="mt-0.5 size-5 shrink-0 text-primary" />;
  }
  if (status === "skipped") {
    return <SkipForward className="mt-0.5 size-5 shrink-0 text-muted-foreground" />;
  }
  if (status === "running") {
    return <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />;
  }
  if (status === "awaiting") {
    return (
      <div className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
        <Circle className="size-5 text-primary/50" />
        <span className="absolute text-[10px] font-semibold text-primary">{index}</span>
      </div>
    );
  }
  return (
    <div className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
      <Circle className="size-5 text-border" />
      <span className="absolute text-[10px] font-semibold text-muted-foreground">{index}</span>
    </div>
  );
}
