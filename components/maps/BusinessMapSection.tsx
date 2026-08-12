"use client";

import dynamic from "next/dynamic";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import { ListingFieldFlagNote } from "@/components/business/ListingFieldFlagNote";

const BusinessesOpenStreetMap = dynamic(
  () =>
    import("@/components/maps/BusinessesOpenStreetMap").then((m) => m.BusinessesOpenStreetMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center bg-[var(--color-surface)] text-sm text-[var(--color-text-tertiary)]">
        Loading map…
      </div>
    ),
  },
);

type Props = {
  markers: BusinessMapMarker[];
  title?: string;
  description?: string;
  className?: string;
  /** Unverified listings: allow visitors to flag a wrong map pin. */
  fieldFlagEntityId?: string | null;
  fieldFlagEntity?: "business" | "rental";
};

/**
 * Location map section — monochrome Carto tiles (light/dark) via Leaflet.
 */
export function BusinessMapSection({
  markers,
  title = "Location",
  description,
  className = "",
  fieldFlagEntityId,
  fieldFlagEntity = "business",
}: Props) {
  if (markers.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="font-headline text-xl font-semibold text-zinc-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      <div className="mt-3 h-64 overflow-hidden border border-zinc-200 sm:h-80 dark:border-zinc-700">
        <BusinessesOpenStreetMap markers={markers} zoom={17} className="!rounded-none" />
      </div>
      {fieldFlagEntityId ? (
        <ListingFieldFlagNote
          entity={fieldFlagEntity}
          entityId={fieldFlagEntityId}
          field="map"
        />
      ) : null}
    </section>
  );
}
