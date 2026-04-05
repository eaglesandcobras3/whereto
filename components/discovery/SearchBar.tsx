"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
  /** Larger typography and padding for the home hero. */
  variant?: "default" | "hero";
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder = 'Try "kid friendly lunch near Seaside"',
  variant = "default",
}: Props) {
  const isHero = variant === "hero";
  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col gap-2 sm:flex-row ${isHero ? "sm:items-stretch" : ""}`}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          isHero
            ? "min-h-[3.25rem] flex-1 rounded-2xl border border-zinc-300/90 bg-white px-5 py-4 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 sm:text-lg"
            : "flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 shadow-sm"
        }
      />
      <button
        type="submit"
        disabled={loading}
        className={
          isHero
            ? "min-h-[3.25rem] shrink-0 rounded-2xl bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white hover:opacity-95 disabled:opacity-50 sm:text-lg"
            : "rounded-xl bg-[var(--accent)] px-6 py-3 font-medium text-white hover:opacity-95 disabled:opacity-50"
        }
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
