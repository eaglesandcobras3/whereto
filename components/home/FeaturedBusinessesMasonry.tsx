"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import Masonry from "masonry-layout";
import imagesLoaded from "imagesloaded";
import type { BusinessPayload } from "@/lib/search/types";

export type FeaturedBusiness = BusinessPayload & {
  featured_title?: string | null;
  featured_description?: string | null;
  badge?: string | null;
};

const GUTTER = 32;

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

function columnCountForWidth(containerWidth: number) {
  if (containerWidth >= 1024) return 3;
  if (containerWidth >= 640) return 2;
  return 1;
}

function columnWidthPx(containerWidth: number) {
  const cols = columnCountForWidth(containerWidth);
  return (containerWidth - GUTTER * (cols - 1)) / cols;
}

type Props = {
  businesses: FeaturedBusiness[];
};

export function FeaturedBusinessesMasonry({ businesses }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const masonryRef = useRef<Masonry | null>(null);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [columnWidth, setColumnWidth] = useState<number | null>(null);

  const idsKey = businesses.map((b) => b.id).join(",");

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || businesses.length === 0) return;
    setColumnWidth(columnWidthPx(el.clientWidth));
  }, [businesses.length, idsKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || businesses.length === 0) return;

    const measure = () => {
      setColumnWidth(columnWidthPx(el.clientWidth));
    };

    const ro = new ResizeObserver(() => {
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = setTimeout(measure, 120);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
    };
  }, [businesses.length, idsKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || columnWidth == null || businesses.length === 0) return;

    const previous = masonryRef.current;
    previous?.destroy?.();
    masonryRef.current = null;

    const msnry = new Masonry(el, {
      itemSelector: ".featured-masonry__item",
      columnWidth,
      gutter: GUTTER,
      percentPosition: false,
      transitionDuration: "0.2s",
      resize: false,
    });
    masonryRef.current = msnry;

    let cancelled = false;
    imagesLoaded(el, () => {
      if (cancelled) return;
      msnry.reloadItems?.();
      msnry.layout?.();
    });

    return () => {
      cancelled = true;
      msnry.destroy?.();
      masonryRef.current = null;
    };
  }, [columnWidth, idsKey, businesses.length]);

  if (businesses.length === 0) return null;

  return (
    <div ref={containerRef} className="relative mx-auto">
      {businesses.map((b, index) => {
        const imageHeightClass =
          index % 3 === 0
            ? "h-72"
            : index % 3 === 1
              ? "h-56"
              : "h-80";
        const copyClampClass = index % 2 === 0 ? "line-clamp-4" : "line-clamp-3";
        return (
          <div
            key={b.id}
            className="featured-masonry__item"
            style={
              columnWidth != null
                ? { width: columnWidth, marginBottom: GUTTER }
                : { width: "100%" }
            }
          >
            <Link
              href={`/business/${b.slug}`}
              className="group block overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`relative ${imageHeightClass}`}>
                {b.hero_image_url ? (
                  <Image
                    src={b.hero_image_url}
                    alt={b.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    onLoad={() => {
                      const m = masonryRef.current;
                      m?.reloadItems?.();
                      m?.layout?.();
                    }}
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
              <div className="p-6">
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
