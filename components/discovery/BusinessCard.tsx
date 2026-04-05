"use client";

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
  variant?: "consumer" | "admin";
  onSave?: (id: string) => void;
  onDirectionsClick?: (businessId: string) => void;
  onWebsiteClick?: (businessId: string) => void;
};

export function BusinessCard({
  rec,
  variant = "consumer",
  onSave,
  onDirectionsClick,
  onWebsiteClick,
}: Props) {
  const b = rec.business;
  const m = b.lat != null && b.lng != null;
  const showStars =
    variant === "admin" &&
    b.google_rating != null &&
    !b.hideRatings;

  return (
    <li className="min-w-[280px] max-w-sm shrink-0 snap-start rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:min-w-[300px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-zinc-900">
            {b.name ?? "Business"}
          </p>
          <p className="text-sm font-medium text-teal-800">{rec.headline}</p>
        </div>
        <div className="flex gap-2">
          {onSave ? <SaveButton businessId={rec.business_id} onSave={onSave} /> : null}
        </div>
      </div>
      <p className="mt-2 text-sm text-zinc-700">{rec.explanation}</p>
      {showStars ? (
        <p className="mt-2 text-sm text-amber-700">★ {b.google_rating}</p>
      ) : null}
      <TagPills
        tags={[...(rec.highlighted_tags ?? []), ...(b.tags ?? [])]}
      />
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {m ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 hover:underline"
            onClick={() => onDirectionsClick?.(rec.business_id)}
          >
            Directions
          </a>
        ) : null}
        {b.website ? (
          <a
            href={b.website}
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 hover:underline"
            onClick={() => onWebsiteClick?.(rec.business_id)}
          >
            Website
          </a>
        ) : null}
        {b.slug ? (
          <a href={`/business/${b.slug}`} className="text-zinc-600 hover:underline">
            Details
          </a>
        ) : null}
      </div>
    </li>
  );
}
