"use client";

import { PromptChip } from "@/components/ui/prompt-chip";

type Props = {
  prompts: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function PromptChips({ prompts, onPick, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p) => (
        <PromptChip key={p} onClick={() => onPick(p)} disabled={disabled}>
          {p}
        </PromptChip>
      ))}
    </div>
  );
}
