import Link from "next/link";

type Props = {
  name: string;
  slug: string;
  subtitle?: string;
  /** Optional real image URL */
  imageUrl?: string | null;
  /** Show compact variant */
  compact?: boolean;
};

function heroGradient(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 3)) % 360;
  const palettes = [
    "from-cyan-300/80 via-sky-200/70 to-indigo-200/60",
    "from-amber-300/70 via-orange-200/60 to-rose-200/55",
    "from-teal-300/75 via-emerald-200/65 to-cyan-200/60",
    "from-slate-300/70 via-zinc-200/60 to-stone-200/50",
    "from-violet-300/70 via-purple-200/60 to-pink-200/55",
    "from-lime-300/70 via-green-200/60 to-emerald-200/55",
  ];
  return palettes[h % palettes.length];
}

export function TownCard({ name, slug, subtitle, imageUrl, compact = false }: Props) {
  return (
    <Link
      href={`/${slug}`}
      className={`
        group block overflow-hidden rounded-2xl
        border border-[var(--color-border)] bg-[var(--color-surface)]
        shadow-premium-sm
        transition-premium hover-lift
      `}
    >
      {/* Image / Gradient Header with parallax hover effect */}
      <div
        className={`relative overflow-hidden ${compact ? "h-28" : "h-36"}`}
        aria-hidden
      >
        <div
          className={`
            absolute inset-0 bg-gradient-to-br ${heroGradient(slug)}
            transition-transform duration-500 ease-out
            group-hover:scale-105
          `}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

        {/* Town name overlay */}
        <p
          className={`
            absolute bottom-3 left-4 font-semibold tracking-tight text-white
            drop-shadow-md transition-transform duration-300
            group-hover:translate-x-1
            ${compact ? "text-lg" : "text-xl"}
          `}
        >
          {name}
        </p>
      </div>

      {/* Content */}
      <div className={compact ? "p-4" : "p-5"}>
        {subtitle ? (
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">
            {subtitle}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Explore the guide
          </p>
        )}
        <p
          className={`
            mt-3 inline-flex items-center gap-1 text-sm font-medium
            text-[var(--color-primary)]
            transition-colors group-hover:text-[var(--color-primary-light)]
          `}
        >
          Open town guide
          <svg
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </p>
      </div>
    </Link>
  );
}
