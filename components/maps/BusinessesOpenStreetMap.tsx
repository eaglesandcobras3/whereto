"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import "leaflet/dist/leaflet.css";

type Props = {
  markers: BusinessMapMarker[];
  className?: string;
  /** Default zoom when only one marker. */
  zoom?: number;
};

const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function readDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function mapMarkerSvg(dark: boolean): string {
  const fill = dark ? "#5eead4" : "#0f766e";
  const stroke = dark ? "#042f2e" : "#f0fdfa";
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path fill="${fill}" stroke="${stroke}" stroke-width="2"
        d="M14 1C7.4 1 2 6.4 2 13c0 9.1 12 25 12 25s12-15.9 12-25C26 6.4 20.6 1 14 1z"/>
      <circle cx="14" cy="13" r="4.5" fill="${stroke}"/>
    </svg>`,
  );
}

/**
 * OpenStreetMap via Leaflet — Carto Voyager (soft color) in light mode, dark_all in dark.
 */
export function BusinessesOpenStreetMap({ markers, className = "", zoom = 19 }: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dark, setDark] = useState(false);
  const markersKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}`).join("|");

  useEffect(() => {
    setDark(readDarkMode());
    const observer = new MutationObserver(() => setDark(readDarkMode()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || markers.length === 0) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function mount() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const icon = L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${mapMarkerSvg(dark)}`,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -36],
      });

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
        attribution: TILE_ATTR,
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const m of markers) {
        const latlng = L.latLng(m.lat, m.lng);
        bounds.extend(latlng);
        const linkClass = dark
          ? "font-medium text-zinc-100 underline"
          : "font-medium text-zinc-900 underline";
        const popup = `<a href="/business/${encodeURIComponent(m.slug)}" class="${linkClass}">${escapeHtml(m.title)}</a>`;
        L.marker(latlng, { icon }).addTo(map).bindPopup(popup);
      }

      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], zoom);
      } else if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.05), { maxZoom: Math.max(zoom, 18) });
      }

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
  }, [markersKey, zoom, mapId, dark]);

  if (markers.length === 0) return null;

  return (
    <div
      ref={containerRef}
      id={`businesses-map-${mapId}`}
      className={`h-full min-h-[16rem] w-full bg-[var(--color-surface)] ${className}`}
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
