"use client";

import { useEffect, useRef, useState } from "react";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { cn } from "@/lib/utils";

type CarouselBusiness = {
  id: string;
  name: string;
  slug: string;
  excerpt?: string | null;
  heroImageUrl?: string | null;
};

type Props = {
  businesses: CarouselBusiness[];
  analyticsCategory: string;
  analyticsLabelPrefix: string;
  labelledBy?: string;
  className?: string;
};

const SCROLL_GAP = 16;

export function BusinessPreviewCarousel({
  businesses,
  analyticsCategory,
  analyticsLabelPrefix,
  labelledBy,
  className,
}: Props) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function update() {
      const node = scrollRef.current;
      if (!node) return;
      setCanScrollLeft(node.scrollLeft > 10);
      setCanScrollRight(
        node.scrollLeft < node.scrollWidth - node.clientWidth - 10,
      );
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [businesses.length]);

  if (businesses.length === 0) return null;

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("li");
    const amount = (card?.offsetWidth ?? 320) + SCROLL_GAP;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div className={cn("relative", className)}>
      {/* Gradient fade edges */}
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-[var(--color-background)] to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-[var(--color-background)] to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className={cn(
          "absolute -left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-md transition-all hover:bg-[var(--color-surface-secondary)]",
          canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Scroll left"
      >
        <span className="material-symbols-outlined !text-xl text-[var(--color-text-secondary)]">
          chevron_left
        </span>
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        className={cn(
          "absolute -right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-md transition-all hover:bg-[var(--color-surface-secondary)]",
          canScrollRight ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Scroll right"
      >
        <span className="material-symbols-outlined !text-xl text-[var(--color-text-secondary)]">
          chevron_right
        </span>
      </button>

      {/* Card strip */}
      <ul
        ref={scrollRef}
        aria-labelledby={labelledBy}
        className="flex gap-4 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scrollbar-hide"
      >
        {businesses.map((business) => (
          <li
            key={business.id}
            className="min-w-[min(320px,85vw)] max-w-sm shrink-0 snap-start"
          >
            <BusinessPreviewCard
              name={business.name}
              slug={business.slug}
              excerpt={business.excerpt}
              heroImageUrl={business.heroImageUrl}
              analyticsCategory={analyticsCategory}
              analyticsLabel={`${analyticsLabelPrefix}_${business.slug}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
