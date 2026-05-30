"use client";

import { PromptChips } from "@/components/home/PromptChips";

type Props = {
  followUps: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function FollowUpChips({ followUps, onPick, disabled }: Props) {
  if (!followUps.length || disabled) return null;
  return (
    <div className="mt-3">
      <PromptChips prompts={followUps} onPick={onPick} disabled={disabled} />
    </div>
  );
}
