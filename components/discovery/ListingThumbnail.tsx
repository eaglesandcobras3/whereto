"use client";

import { useState } from "react";

function gradientForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 1)) % 360;
  const palettes = [
    "from-sky-100/90 via-cyan-50/80 to-teal-100/70",
    "from-amber-50/90 via-orange-50/70 to-rose-100/60",
    "from-emerald-50/90 via-teal-50/70 to-cyan-100/60",
    "from-violet-50/80 via-slate-50/70 to-sky-100/60",
    "from-rose-50/80 via-pink-50/70 to-fuchsia-100/60",
    "from-lime-50/80 via-green-50/70 to-emerald-100/60",
  ];
  return palettes[h % palettes.length];
}

type Props = {
  slug: string;
  imageUrl?: string | null;
  /** Tailwind aspect + min-height, e.g. `aspect-[5/4] min-h-[176px]` */
  className?: string;
  rounded?: "top" | "all" | "none";
};

/**
 * Listing hero thumb: Places photo (proxied) or soft gradient; subtle bottom vignette for depth.
 */
export function ListingThumbnail({
  slug,
  imageUrl,
  className = "aspect-[5/4] min-h-[168px]",
  rounded = "top",
}: Props) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(imageUrl && !failed);
  const round =
    rounded === "top"
      ? "rounded-t-[var(--radius-listing)]"
      : rounded === "all"
        ? "rounded-[var(--radius-listing)]"
        : "";

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradientForSlug(slug)} ${round} ${className}`}
      aria-hidden
    >
      {show ? (
        <img
          src={imageUrl as string}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.18] via-transparent to-white/[0.06]" />
    </div>
  );
}
