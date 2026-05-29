import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  name: string;
  slug: string;
  subtitle?: string;
  imageUrl?: string | null;
  analyticsCategory?: string;
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

export function AreaCard({
  name,
  slug,
  subtitle,
  imageUrl,
  analyticsCategory = "area_card",
}: Props) {
  return (
    <Link
      href={`/area/${slug}`}
      {...gaClickProps({ event: "nav_click", category: analyticsCategory, label: slug })}
      className="
        group block overflow-hidden rounded-[var(--radius-listing)]
        border border-[var(--color-border)] bg-[var(--color-surface)]
        shadow-premium-sm
        transition-premium hover-lift
      "
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div
          className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl sm:w-28 md:w-32"
          aria-hidden
        >
          <div
            className={`
              absolute inset-0 bg-gradient-to-br ${heroGradient(slug)}
              transition-transform duration-700 ease-out
              group-hover:scale-[1.03]
            `}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <h3 className="font-headline text-lg font-bold tracking-tight text-[var(--color-text-primary)] sm:text-xl">
            {name}
          </h3>
          {subtitle ? (
            <p className="text-listing-meta line-clamp-2">{subtitle}</p>
          ) : (
            <p className="text-listing-meta text-[var(--color-text-tertiary)]">
              Shops, dining, and local spots
            </p>
          )}
          <p
            className="
              inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
              text-[var(--color-primary)]
              transition-colors group-hover:text-[var(--color-primary-light)]
            "
          >
            Explore area
            <svg
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </p>
        </div>
      </div>
    </Link>
  );
}
