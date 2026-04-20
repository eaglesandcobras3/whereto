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
      {businesses.map((b, index) => {
        const copyClampClass = index % 3 === 0 ? "line-clamp-3" : "line-clamp-2";
        return (
          <div
            key={b.id}
            className="h-full"
          >
            <Link
              href={`/business/${b.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden">
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
              <div className="flex min-h-[168px] flex-col p-4 sm:p-5">
                <h3 className="font-headline text-lg font-semibold tracking-tight text-zinc-900 transition-colors group-hover:text-primary sm:text-xl">
                  {b.name}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed text-zinc-600 ${copyClampClass}`}
                >
                  {b.featured_description ||
                    b.ai_summary ||
                    "Explore more about this local favorite."}
                </p>
                <div className="mt-auto pt-4 text-sm font-semibold text-primary">
                  View details
                  <MsIcon name="chevron_right" className="!text-lg inline-block align-middle" />
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
