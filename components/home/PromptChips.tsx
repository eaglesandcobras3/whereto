"use client";

type Props = {
  prompts: string[];
  onPick: (text: string) => void;
};

export function PromptChips({ prompts, onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPick(p)}
          className="
            rounded-full border border-[var(--color-border-strong)]
            bg-[var(--color-surface)] px-4 py-2
            text-left text-sm text-[var(--color-text-secondary)]
            shadow-premium-sm
            transition-premium-fast
            hover:border-[var(--color-primary)]/50
            hover:bg-[var(--accent-soft)]
            hover:text-[var(--color-text-primary)]
          "
        >
          {p}
        </button>
      ))}
    </div>
  );
}
