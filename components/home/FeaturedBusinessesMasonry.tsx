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
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {businesses.map((b) => (
        <Link
          key={b.id}
          href={`/business/${b.slug}`}
          className="editorial-card group relative overflow-hidden rounded-2xl"
        >
          {/* Portrait image with overlay */}
          <div className="relative aspect-[2/3] w-full overflow-hidden">
            {b.hero_image_url ? (
              <Image
                src={b.hero_image_url}
                alt={b.name}
                fill
                unoptimized
                className="img-editorial-fast object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/60">
                <div className="flex h-full items-center justify-center">
                  <MsIcon name="storefront" className="!text-5xl text-white/40" />
                </div>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="editorial-gradient absolute inset-0" />

            {/* Badge */}
            {b.badge && (
              <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-primary backdrop-blur-sm">
                {b.badge}
              </div>
            )}

            {/* Content overlay */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <h3 className="font-headline text-lg font-bold leading-tight text-white sm:text-xl">
                {b.name}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-snug text-white/90">
                {b.featured_description ||
                  b.ai_summary ||
                  "Explore more about this local favorite."}
              </p>

              {/* Hover reveal link */}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Explore
                <MsIcon name="arrow_forward" className="!text-sm" />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
