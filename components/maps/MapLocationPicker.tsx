"use client";

import { useEffect, useId, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/** Scenic 30A corridor default — Santa Rosa Beach / WaterColor area. */
export const DEFAULT_MAP_CENTER = { lat: 30.3165, lng: -86.133 } as const;

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  className?: string;
  /** Zoom when a pin is set. */
  zoom?: number;
  /** Zoom when showing the default corridor overview. */
  emptyZoom?: number;
  /** Optional name attributes for classic form posts. */
  latInputName?: string;
  lngInputName?: string;
  helpText?: string;
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

function roundCoord(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Click / drag to set a map pin. Soft-color Carto Voyager tiles (dark_all in dark mode).
 */
export function MapLocationPicker({
  lat,
  lng,
  onChange,
  className = "",
  zoom = 18,
  emptyZoom = 11,
  latInputName,
  lngInputName,
  helpText = "Click the map to drop a pin, or drag the pin to adjust.",
}: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [dark, setDark] = useState(false);
  const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setDark(readDarkMode());
    const observer = new MutationObserver(() => setDark(readDarkMode()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Mount map once per theme.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function mount() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], emptyZoom);

      L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
        attribution: TILE_ATTR,
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(map);

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        onChangeRef.current(roundCoord(e.latlng.lat), roundCoord(e.latlng.lng));
      });

      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    }

    void mount();

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [dark, mapId, emptyZoom]);

  // Sync marker with controlled lat/lng.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || mapRef.current !== map) return;

      const icon = L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${mapMarkerSvg(dark)}`,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
      });

      if (!hasPin) {
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
          markerRef.current = null;
        }
        map.setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], emptyZoom);
        return;
      }

      const next = L.latLng(lat as number, lng as number);
      if (!markerRef.current) {
        const marker = L.marker(next, { icon, draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChangeRef.current(roundCoord(pos.lat), roundCoord(pos.lng));
        });
        markerRef.current = marker;
        map.setView(next, zoom);
      } else {
        markerRef.current.setLatLng(next);
        markerRef.current.setIcon(icon);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lat, lng, hasPin, dark, zoom, emptyZoom]);

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs text-[var(--color-text-tertiary)]">{helpText}</p>
      <div
        ref={containerRef}
        id={`map-picker-${mapId}`}
        className="h-56 w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] sm:h-64"
        role="application"
        aria-label="Set location on map"
      />
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
        {hasPin ? (
          <span>
            Pin: {lat!.toFixed(5)}, {lng!.toFixed(5)}
          </span>
        ) : (
          <span>No pin set yet</span>
        )}
        {hasPin ? (
          <button
            type="button"
            className="underline underline-offset-2 hover:text-[var(--color-primary)]"
            onClick={() => onChangeRef.current(null, null)}
          >
            Clear pin
          </button>
        ) : null}
      </div>
      {latInputName ? (
        <input type="hidden" name={latInputName} value={hasPin ? String(lat) : ""} />
      ) : null}
      {lngInputName ? (
        <input type="hidden" name={lngInputName} value={hasPin ? String(lng) : ""} />
      ) : null}
    </div>
  );
}
