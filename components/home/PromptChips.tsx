"use client";

import { PromptChip } from "@/components/ui/prompt-chip";

type Props = {
  prompts: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
  className?: string;
  chipClassName?: string;
};

export function PromptChips({ prompts, onPick, disabled, className, chipClassName }: Props) {
  return (
    <div className={className ?? "flex flex-wrap gap-2"}>
      {prompts.map((p) => (
        <PromptChip key={p} onClick={() => onPick(p)} disabled={disabled} className={chipClassName}>
          {p}
        </PromptChip>
      ))}
    </div>
  );
}
