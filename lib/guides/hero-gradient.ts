/** Deterministic Tailwind gradient classes for guide cards and text-only guide headers. */
export function guideHeroGradient(slug: string): string {
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
