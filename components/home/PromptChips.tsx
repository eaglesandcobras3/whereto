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
          className="rounded-full border border-zinc-200/90 bg-white px-4 py-2 text-left text-sm text-zinc-700 shadow-sm transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]/30"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
