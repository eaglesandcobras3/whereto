"use client";

import { Headphones } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { HumanHandoffStatusArtifact } from "@/lib/ask/types";

type Props = {
  artifact: HumanHandoffStatusArtifact;
};

export function HumanHandoffArtifact({ artifact }: Props) {
  return (
    <Alert className="border-primary/20 bg-accent">
      <Headphones className="size-4 text-primary" aria-hidden />
      <AlertTitle className="text-eyebrow text-primary">Human review</AlertTitle>
      <AlertDescription className="mt-2 space-y-2 text-foreground">
        <p className="text-base font-medium">We&apos;re on it</p>
        <p className="text-sm text-muted-foreground">{artifact.message}</p>
        <p className="text-xs text-muted-foreground">
          Reference: {artifact.taskId.slice(0, 8)}…
        </p>
      </AlertDescription>
    </Alert>
  );
}
