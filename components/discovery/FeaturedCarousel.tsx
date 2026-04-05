"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import type { HomeFeaturedBusiness } from "@/lib/data/home-features";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { TagPills } from "@/components/discovery/TagPills";

function gradientForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 1)) % 360;
  const palettes = [
    "from-sky-200/90 via-cyan-100/80 to-teal-200/70",
    "from-amber-100/90 via-orange-100/70 to-rose-200/60",
    "from-emerald-100/90 via-teal-100/70 to-cyan-200/60",
    "from-violet-100/80 via-slate-100/70 to-sky-200/60",
    "from-rose-100/80 via-pink-100/70 to-fuchsia-200/60",
    "from-lime-100/80 via-green-100/70 to-emerald-200/60",
  ];
  return palettes[h % palettes.length];
}

type Props = {
  title: string;
  subtitle?: string;
  businesses: HomeFeaturedBusiness[];
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show dot indicators */
  showDots?: boolean;
};

export function FeaturedCarousel({
  title,
  subtitle,
  businesses,
  showArrows = true,
  showDots = false,
}: Props) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!businesses.length) return null;

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);

    // Calculate active index for dots
    const cardWidth = el.querySelector("li")?.offsetWidth ?? 300;
    const gap = 16; // gap-4
    const index = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(index, businesses.length - 1));
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;

    const cardWidth = el.querySelector("li")?.offsetWidth ?? 300;
    const scrollAmount = cardWidth + 16; // card width + gap

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }

  function scrollToIndex(index: number) {
    const el = scrollRef.current;
    if (!el) return;

    const cardWidth = el.querySelector("li")?.offsetWidth ?? 300;
    const gap = 16;

    el.scrollTo({
      left: index * (cardWidth + gap),
      behavior: "smooth",
    });
  }

  return (
    <SectionBlock title={title} subtitle={subtitle}>
      <div className="relative">
        {/* Navigation arrows */}
        {showArrows && (
          <>
            <button
              type="button"
              onClick={() => scroll("left")}
              className={`
                absolute -left-4 top-1/2 z-10 -translate-y-1/2
                flex h-10 w-10 items-center justify-center
                rounded-full border border-[var(--color-border)]
                bg-[var(--color-surface)] shadow-premium-md
                transition-all duration-200
                hover:bg-[var(--color-surface-secondary)] hover:shadow-premium-lg
                ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}
              `}
              aria-label="Scroll left"
            >
              <svg
                className="h-5 w-5 text-[var(--color-text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => scroll("right")}
              className={`
                absolute -right-4 top-1/2 z-10 -translate-y-1/2
                flex h-10 w-10 items-center justify-center
                rounded-full border border-[var(--color-border)]
                bg-[var(--color-surface)] shadow-premium-md
                transition-all duration-200
                hover:bg-[var(--color-surface-secondary)] hover:shadow-premium-lg
                ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}
              `}
              aria-label="Scroll right"
            >
              <svg
                className="h-5 w-5 text-[var(--color-text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Gradient overlays for scroll indication */}
        <div
          className={`
            absolute left-0 top-0 bottom-3 w-12 z-[5]
            bg-gradient-to-r from-[var(--color-background)] to-transparent
            pointer-events-none
            transition-opacity duration-200
            ${canScrollLeft ? "opacity-100" : "opacity-0"}
          `}
        />
        <div
          className={`
            absolute right-0 top-0 bottom-3 w-12 z-[5]
            bg-gradient-to-l from-[var(--color-background)] to-transparent
            pointer-events-none
            transition-opacity duration-200
            ${canScrollRight ? "opacity-100" : "opacity-0"}
          `}
        />

        {/* Carousel */}
        <ul
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scrollbar-hide"
        >
          {businesses.map((b) => (
            <li
              key={b.id}
              className="min-w-[min(280px,85vw)] max-w-sm shrink-0 snap-start"
            >
              <Link
                href={`/business/${b.slug}`}
                className="
                  group block overflow-hidden rounded-2xl
                  border border-[var(--color-border)] bg-[var(--color-surface)]
                  shadow-premium-sm
                  transition-premium hover-lift
                "
              >
                {/* Image / Gradient header */}
                <div
                  className={`relative h-28 overflow-hidden bg-gradient-to-br ${gradientForSlug(b.slug)}`}
                  aria-hidden
                >
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="space-y-2 p-4">
                  <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)] line-clamp-1">
                    {b.name}
                  </p>
                  <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {b.ai_summary?.trim() || "A local favorite along 30A."}
                  </p>
                  <TagPills tags={b.tagSlugs.slice(0, 4)} />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Dot indicators */}
        {showDots && businesses.length > 1 && (
          <div className="mt-4 flex justify-center gap-1.5">
            {businesses.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollToIndex(index)}
                className={`
                  h-1.5 rounded-full transition-all duration-200
                  ${
                    index === activeIndex
                      ? "w-6 bg-[var(--color-primary)]"
                      : "w-1.5 bg-[var(--color-border-strong)] hover:bg-[var(--color-text-tertiary)]"
                  }
                `}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </SectionBlock>
  );
}
