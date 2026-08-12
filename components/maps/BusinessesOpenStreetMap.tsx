"use client";

import { useEffect, useId, useRef } from "react";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import "leaflet/dist/leaflet.css";

type Props = {
  markers: BusinessMapMarker[];
  className?: string;
  /** Default zoom when only one marker. */
  zoom?: number;
};

/**
 * Multi-pin OpenStreetMap (Leaflet + OSM tiles). Client-only.
 * Renders nothing useful without markers — callers should gate empty lists.
 */
export function BusinessesOpenStreetMap({ markers, className = "", zoom = 14 }: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}`).join("|");

  useEffect(() => {
    if (!containerRef.current || markers.length === 0) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function mount() {
      const L = (await import("leaflet")).default;

      if (cancelled || !containerRef.current) return;

      // Fix default marker icon paths under bundlers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const m of markers) {
        const latlng = L.latLng(m.lat, m.lng);
        bounds.extend(latlng);
        const popup = `<a href="/business/${encodeURIComponent(m.slug)}" class="font-medium text-teal-900 underline">${escapeHtml(m.title)}</a>`;
        L.marker(latlng).addTo(map).bindPopup(popup);
      }

      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], zoom);
      } else if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.18), { maxZoom: 15 });
      }

      // Leaflet needs a layout pass after the container mounts.
      requestAnimationFrame(() => map?.invalidateSize());
    }

    void mount();

    return () => {
      cancelled = true;
      map?.remove();
      map = null;
    };
    // markersKey captures marker identity/coords without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, zoom, mapId]);

  if (markers.length === 0) return null;

  return (
    <div
      ref={containerRef}
      id={`businesses-map-${mapId}`}
      className={`h-full min-h-[16rem] w-full ${className}`}
      role="img"
      aria-label="Map of businesses"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
