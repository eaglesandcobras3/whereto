"use client";

import { ChevronRight, FileText, MapPin, Store } from "lucide-react";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import { cn } from "@/lib/utils";
import type { AskArtifact } from "@/lib/ask/types";
import { isRichArtifact, richCardPreview } from "@/lib/ask/artifact-rich-card";

type Props = {
  artifact: AskArtifact;
  onOpen: () => void;
  isPanelOpen?: boolean;
};

export function AskArtifactRichCard({ artifact, onOpen, isPanelOpen }: Props) {
  if (!isRichArtifact(artifact)) return null;

  const preview = richCardPreview(artifact);
  const hasImage = Boolean(preview.imageUrl);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group mt-3 flex w-full max-w-md overflow-hidden rounded-xl border text-left shadow-premium-sm transition-premium-fast",
        "hover:border-primary/40 hover:shadow-premium-md",
        isPanelOpen ? "border-primary/50 ring-2 ring-primary/20" : "border-border bg-card",
      )}
      aria-label={`Open ${preview.title}`}
    >
      {hasImage ? (
        <div className="relative h-20 w-24 shrink-0 overflow-hidden bg-accent sm:h-24 sm:w-28">
          <RemoteCoverImage
            src={preview.imageUrl!}
            alt=""
            placeholderIcon="storefront"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-16 shrink-0 items-center justify-center bg-accent text-accent-foreground sm:h-24 sm:w-20">
          {artifact.type === "business_results" ? (
            <Store className="size-7 opacity-70" aria-hidden />
          ) : artifact.type === "feedback_form" || artifact.type === "business_submission_form" ? (
            <FileText className="size-7 opacity-70" aria-hidden />
          ) : (
            <MapPin className="size-7 opacity-70" aria-hidden />
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2.5 sm:px-4 sm:py-3">
        <span className="truncate text-sm font-medium text-foreground">{preview.title}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{preview.subtitle}</span>
        <span className="mt-1 text-xs font-medium text-primary group-hover:underline">
          View details
        </span>
      </div>
      <ChevronRight
        className="mr-3 size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}
