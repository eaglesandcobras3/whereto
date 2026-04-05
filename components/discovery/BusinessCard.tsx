"use client";

import Link from "next/link";
import { TagPills } from "@/components/discovery/TagPills";
import { SaveButton } from "@/components/discovery/SaveButton";

export type BusinessCardBusiness = {
  id?: string;
  slug?: string;
  name?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  website?: string | null;
  tags?: string[];
  ai_summary?: string | null;
  /** When true, omit Google stars (consumer policy — PRD-SEO-TOWNS). */
  hideRatings?: boolean;
  google_rating?: number | null;
  /** Optional image URL */
  image_url?: string | null;
};

type Rec = {
  business_id: string;
  rank: number;
  headline: string;
  explanation: string;
  highlighted_tags: string[];
  business: BusinessCardBusiness;
};

type Props = {
  rec: Rec;
  variant?: "consumer" | "admin" | "compact";
  onSave?: (id: string) => void;
  onDirectionsClick?: (businessId: string) => void;
  onWebsiteClick?: (businessId: string) => void;
};

function generateGradient(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 1)) % 360;
  const gradients = [
    "from-sky-100/90 via-cyan-50/80 to-teal-100/70",
    "from-amber-50/90 via-orange-50/70 to-rose-100/60",
    "from-emerald-50/90 via-teal-50/70 to-cyan-100/60",
    "from-violet-50/80 via-slate-50/70 to-sky-100/60",
    "from-rose-50/80 via-pink-50/70 to-fuchsia-100/60",
    "from-lime-50/80 via-green-50/70 to-emerald-100/60",
  ];
  return gradients[h % gradients.length];
}

export function BusinessCard({
  rec,
  variant = "consumer",
  onSave,
  onDirectionsClick,
  onWebsiteClick,
}: Props) {
  const b = rec.business;
  const m = b.lat != null && b.lng != null;
  const showStars = variant === "admin" && b.google_rating != null && !b.hideRatings;
  const isCompact = variant === "compact";
  const slug = b.slug ?? b.id ?? rec.business_id;

  return (
    <li
      className={`
        group shrink-0 snap-start overflow-hidden rounded-2xl
        border border-[var(--color-border)] bg-[var(--color-surface)]
        shadow-premium-sm
        transition-premium hover-lift
        ${isCompact ? "min-w-[260px] max-w-[280px]" : "min-w-[280px] max-w-sm sm:min-w-[300px]"}
      `}
    >
      {/* Image / Gradient Header */}
      {!isCompact && (
        <div
          className={`relative h-24 bg-gradient-to-br ${generateGradient(slug)}`}
          aria-hidden
        >
          {b.image_url ? (
            <img
              src={b.image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className={isCompact ? "p-4" : "p-5"}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {b.slug ? (
              <Link
                href={`/business/${b.slug}`}
                className="block text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors truncate"
              >
                {b.name ?? "Business"}
              </Link>
            ) : (
              <p className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                {b.name ?? "Business"}
              </p>
            )}
            <p className="text-sm font-medium text-[var(--color-primary)] line-clamp-1">
              {rec.headline}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {onSave ? (
              <SaveButton businessId={rec.business_id} onSave={onSave} />
            ) : null}
          </div>
        </div>

        <p
          className={`mt-2 text-sm text-[var(--color-text-secondary)] ${
            isCompact ? "line-clamp-2" : "line-clamp-3"
          }`}
        >
          {rec.explanation}
        </p>

        {showStars ? (
          <p className="mt-2 flex items-center gap-1 text-sm text-amber-600">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {b.google_rating}
          </p>
        ) : null}

        <TagPills
          tags={[...(rec.highlighted_tags ?? []), ...(b.tags ?? [])]}
          max={isCompact ? 4 : 6}
        />

        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {m ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
              onClick={() => onDirectionsClick?.(rec.business_id)}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Directions
            </a>
          ) : null}
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
