"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BusinessPayload } from "@/lib/search/types";

export type FeaturedBusiness = BusinessPayload & {
  featured_title?: string | null;
  featured_description?: string | null;
  badge?: string | null;
};

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={
        filled
          ? ({ fontVariationSettings: '"FILL" 1' } as CSSProperties)
          : undefined
      }
      aria-hidden
    >
      {name}
    </span>
  );
}

type Props = {
  businesses: FeaturedBusiness[];
};

export function FeaturedBusinessesMasonry({ businesses }: Props) {
  if (businesses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
      {businesses.map((b) => (
        <Link
          key={b.id}
          href={`/business/${b.slug}`}
          className="editorial-card group flex flex-row items-stretch gap-0 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
        >
          <div className="relative aspect-[2/3] w-28 shrink-0 self-start bg-zinc-100 sm:w-32 md:w-36">
            {b.hero_image_url ? (
              <Image
                src={b.hero_image_url}
                alt={b.name}
                fill
                unoptimized
                className="object-contain"
                sizes="(min-width: 768px) 9rem, 7rem"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/35 to-primary/65">
                <MsIcon name="storefront" className="!text-4xl text-white/45 sm:!text-5xl" />
              </div>
            )}
            {b.badge && (
              <div className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
                {b.badge}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
            <h3 className="font-headline text-lg font-bold leading-snug text-zinc-900 transition-colors group-hover:text-primary sm:text-xl">
              {b.name}
            </h3>
            <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">
              {b.featured_description ||
                b.ai_summary ||
                "Explore more about this local favorite."}
            </p>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary pt-1">
              Explore
              <MsIcon
                name="arrow_forward"
                className="!text-sm transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
