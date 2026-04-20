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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {businesses.map((b, index) => {
        const copyClampClass = index % 2 === 0 ? "line-clamp-4" : "line-clamp-3";
        return (
          <div
            key={b.id}
            className="h-full"
          >
            <Link
              href={`/business/${b.slug}`}
              className="group flex h-full gap-4 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md sm:gap-5 sm:p-5"
            >
              <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl sm:w-32">
                {b.hero_image_url ? (
                  <Image
                    src={b.hero_image_url}
                    alt={b.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40">
                    <div className="flex h-full items-center justify-center">
                      <MsIcon name="storefront" className="!text-6xl text-primary/40" />
                    </div>
                  </div>
                )}
                {b.badge && (
                  <div className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-md">
                    {b.badge}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-headline text-xl font-bold text-zinc-900 transition-colors group-hover:text-primary">
                  {b.name}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed text-zinc-600 ${copyClampClass}`}
                >
                  {b.featured_description ||
                    b.ai_summary ||
                    "Explore more about this local favorite."}
                </p>
                <div className="mt-4 flex items-center text-sm font-bold text-primary">
                  View details
                  <MsIcon name="chevron_right" className="!text-lg" />
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
