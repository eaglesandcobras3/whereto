"use client";

import dynamic from "next/dynamic";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import { OpenStreetMap } from "@/components/OpenStreetMap";

const BusinessesOpenStreetMap = dynamic(
  () =>
    import("@/components/maps/BusinessesOpenStreetMap").then((m) => m.BusinessesOpenStreetMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center bg-zinc-50 text-sm text-zinc-500">
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
};

/**
 * Location map section. Single pin uses the lightweight OSM iframe;
 * multiple pins use Leaflet + OSM tiles.
 */
export function BusinessMapSection({
  markers,
  title = "Location",
  description,
  className = "",
}: Props) {
  if (markers.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="font-headline text-xl font-semibold text-zinc-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      <div className="mt-3 h-64 overflow-hidden border border-zinc-200 sm:h-80">
        {markers.length === 1 ? (
          <OpenStreetMap
            lat={markers[0].lat}
            lng={markers[0].lng}
            zoom={15}
            title={markers[0].title}
            className="h-full min-h-[16rem] !rounded-none !border-0 !shadow-none"
          />
        ) : (
          <BusinessesOpenStreetMap markers={markers} className="!rounded-none" />
        )}
      </div>
    </section>
  );
}
