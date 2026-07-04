"use client";

import Link from "next/link";
import Image from "next/image";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { formatScopeMatchNote } from "@/lib/discovery-filters/format-scope-match";
import { formatTagMatchSummary } from "@/lib/discovery-filters/format-tag-match";
import type { DiscoverListingRow } from "@/lib/discovery-filters/types";
import { cn } from "@/lib/utils";

/** Portrait thumb column — keep in sync with BusinessPreviewCard. */
const IMAGE_COL_WIDTH = "w-28 sm:w-32 md:w-36";
const IMAGE_ASPECT = "aspect-[2/3]";
const CARD_MIN_HEIGHT = "min-h-[10.5rem] sm:min-h-[12rem] md:min-h-[13.5rem]";

type Props = {
  listing: DiscoverListingRow;
  labelForSlug: (slug: string) => string;
  showTagMatch?: boolean;
  preferredEntityType?: "storefront" | "service";
  hasCategoryPreference?: boolean;
};

export function DiscoverListingCard({
  listing,
  labelForSlug,
  showTagMatch = false,
  preferredEntityType = "storefront",
  hasCategoryPreference = false,
}: Props) {
  const thumb = businessListingImageUrl(listing.hero_image_url);
  const showImage = Boolean(thumb);

  const tagMatchSummary =
    showTagMatch && listing.tag_match
      ? formatTagMatchSummary(listing.tag_match, labelForSlug)
      : null;

  const scopeNote =
    showTagMatch && listing.scope_match
      ? formatScopeMatchNote(
          listing.scope_match,
          preferredEntityType,
          hasCategoryPreference,
        )
      : null;

  const matchNotes = [tagMatchSummary, scopeNote].filter(Boolean);

  return (
    <Link
      href={`/business/${listing.slug}`}
      className={cn(
        "editorial-card group h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:shadow-md",
        CARD_MIN_HEIGHT,
        showImage ? "flex flex-row items-stretch gap-0" : "flex flex-col",
      )}
    >
      {showImage ? (
        <div
          className={cn(
            "relative shrink-0 self-start bg-[var(--color-surface-container-high)]",
            IMAGE_ASPECT,
            IMAGE_COL_WIDTH,
          )}
        >
          <Image
            src={thumb!}
            alt={listing.title}
            fill
            unoptimized
            className="object-cover"
            sizes="(min-width: 768px) 9rem, 7rem"
          />
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="font-headline text-lg font-bold leading-snug text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
          {listing.title}
        </h3>
        {listing.town_name ? (
          <p className="text-xs text-[var(--color-text-tertiary)]">{listing.town_name}</p>
        ) : null}
        {matchNotes.length ? (
          <p className="text-xs font-medium text-amber-800">{matchNotes.join(" · ")}</p>
        ) : null}
        {listing.excerpt ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {listing.excerpt}
          </p>
        ) : null}
        {listing.search_tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {listing.search_tags.map((slug) => (
              <span
                key={slug}
                className="inline-flex items-center rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]"
              >
                {labelForSlug(slug)}
              </span>
            ))}
          </div>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-[var(--color-primary)]">
          Explore
          <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-0.5">
            arrow_forward
          </span>
        </span>
      </div>
    </Link>
  );
}
