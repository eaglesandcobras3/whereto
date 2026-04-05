import Link from "next/link";

type Props = {
  name: string;
  slug: string;
  subtitle?: string;
};

function heroGradient(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 3)) % 360;
  const palettes = [
    "from-cyan-200/70 via-sky-100/60 to-indigo-100/50",
    "from-amber-200/60 via-orange-100/50 to-rose-100/45",
    "from-teal-200/65 via-emerald-100/55 to-cyan-100/50",
    "from-slate-200/70 via-zinc-100/60 to-stone-100/50",
  ];
  return palettes[h % palettes.length];
}

export function TownCard({ name, slug, subtitle }: Props) {
  return (
    <Link
      href={`/${slug}`}
      className="group block overflow-hidden rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] shadow-sm transition hover:border-[var(--accent)]/35 hover:shadow-md"
    >
      <div
        className={`relative h-36 bg-gradient-to-br ${heroGradient(slug)}`}
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-60 transition group-hover:opacity-80" />
        <p className="absolute bottom-3 left-4 text-xl font-semibold tracking-tight text-white drop-shadow-sm">
          {name}
        </p>
      </div>
      <div className="p-5">
        {subtitle ? (
          <p className="text-sm leading-relaxed text-zinc-600">{subtitle}</p>
        ) : (
          <p className="text-sm text-zinc-500">Explore the guide</p>
        )}
        <p className="mt-3 text-sm font-medium text-[var(--accent)] group-hover:underline">
          Open town guide →
        </p>
      </div>
    </Link>
  );
}
