"use client";

import Link from "next/link";
import { TagPills } from "@/components/discovery/TagPills";
import { SaveButton } from "@/components/discovery/SaveButton";
import { ListingThumbnail } from "@/components/discovery/ListingThumbnail";
import type { BusinessPayload } from "@/lib/search/types";

export type BusinessCardBusiness = BusinessPayload & {
  /** When true, omit listing rating stars on consumer surfaces (policy). */
  hideRatings?: boolean;
};

type Props = {
  rec: {
    business_id: string;
    rank: number;
    headline: string;
    explanation: string;
    highlighted_tags: string[];
    business: BusinessCardBusiness;
  };
  variant?: "consumer" | "admin" | "compact";
  onSave?: (id: string) => Promise<void>;
  onWebsiteClick?: (id: string) => void;
};

const ICON_MAP: Record<string, string> = {
  Restaurants: "restaurant",
  Stores: "shopping_bag",
  Services: "home_repair_service",
  Activities: "sailing",
  Events: "event",
  Beyond: "explore",
};

function CategoryIcon({ category, className }: { category?: string; className?: string }) {
  const iconName = category ? (ICON_MAP[category] || "storefront") : "storefront";
  return (
    <div className={`flex items-center justify-center bg-primary/5 text-primary/40 ${className}`}>
      <span className="material-symbols-outlined !text-5xl">{iconName}</span>
    </div>
  );
}

export function BusinessCard({
  rec,
  variant = "consumer",
  onSave,
  onWebsiteClick,
}: Props) {
  const b = rec.business;
  const mergedTags = [...(rec.highlighted_tags ?? []), ...(b.tags ?? [])];
  const showStars = variant === "admin" && b.listing_rating != null && !b.hideRatings;
  const isCompact = variant === "compact";
  const slug = b.slug ?? b.id ?? rec.business_id;

  const hasImage = !!b.image_url;

  return (
    <li
      className={`
        group shrink-0 snap-start overflow-hidden rounded-[var(--radius-listing)]
        border border-[var(--color-border)] bg-[var(--color-surface)]
        shadow-premium-sm
        transition-premium hover-lift
        ${isCompact ? "min-w-[260px] max-w-[280px]" : "min-w-[280px] max-w-sm sm:min-w-[300px]"}
      `}
    >
      {!isCompact && (
        <div className="relative aspect-video overflow-hidden">
          {b.slug ? (
            <Link href={`/business/${b.slug}`} className="group block h-full w-full focus:outline-none">
              {hasImage ? (
                <ListingThumbnail slug={slug} imageUrl={b.image_url} className="h-full w-full" rounded="none" />
              ) : (
                <CategoryIcon category={b.category_name} className="h-full w-full" />
              )}
            </Link>
          ) : hasImage ? (
            <ListingThumbnail slug={slug} imageUrl={b.image_url} className="h-full w-full" rounded="none" />
          ) : (
            <CategoryIcon category={b.category_name} className="h-full w-full" />
          )}
        </div>
      )}

      <div className={isCompact ? "space-y-3 p-4" : "space-y-3 p-5"}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {b.slug ? (
              <Link
                href={`/business/${b.slug}`}
                className="text-listing-title block truncate hover:text-[var(--color-primary)] transition-colors"
              >
                {b.name ?? "Business"}
              </Link>
            ) : (
              <p className="text-listing-title truncate">{b.name ?? "Business"}</p>
            )}
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)] line-clamp-1">
              {rec.headline}
            </p>
            {b.address ? (
              <p className="text-listing-meta mt-2 line-clamp-1">{b.address}</p>
            ) : null}
          </div>
          <div className="flex gap-2 shrink-0">
            {onSave ? (
              <SaveButton businessId={rec.business_id} onSave={onSave} />
            ) : null}
          </div>
        </div>

        <p
          className={`text-sm leading-relaxed text-[var(--color-text-secondary)] ${
            isCompact ? "line-clamp-2" : "line-clamp-3"
          }`}
        >
          {rec.explanation}
        </p>

        {showStars ? (
          <p className="flex items-center gap-1 text-sm text-amber-600">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {b.listing_rating}
          </p>
        ) : null}

        {mergedTags.length > 0 ? (
          <div className="divider-listing">
            <TagPills
              tags={mergedTags}
              max={isCompact ? 4 : 6}
              className="!mt-0"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {b.website ? (
            <a
              href={b.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
              onClick={() => onWebsiteClick?.(rec.business_id)}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Website
            </a>
          ) : null}
          {b.slug ? (
            <Link
              href={`/business/${b.slug}`}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:underline"
            >
              Details
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
