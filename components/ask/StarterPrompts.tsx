"use client";

import { PromptChips } from "@/components/home/PromptChips";

export const ASK_STARTER_PROMPTS = [
  "Where should we eat near Rosemary with kids?",
  "Best gluten-free breakfast on 30A?",
  "Where can I get coffee and walk around?",
  "Find dog-friendly places near Inlet Beach.",
  "What should we do before dinner in Grayton?",
  "List my business on WhereTo30A.",
  "I need to report incorrect business info.",
] as const;

type Props = {
  onPick: (text: string) => void;
  disabled?: boolean;
};

export function StarterPrompts({ onPick, disabled }: Props) {
  if (disabled) return null;
  return (
    <div className="space-y-2">
      <p className="text-eyebrow">Try asking</p>
      <PromptChips prompts={[...ASK_STARTER_PROMPTS]} onPick={onPick} disabled={disabled} />
    </div>
  );
}
