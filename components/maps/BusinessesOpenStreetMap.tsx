"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import "leaflet/dist/leaflet.css";

type Props = {
  markers: BusinessMapMarker[];
  className?: string;
  /** Default zoom when only one marker. */
  zoom?: number;
  /** Cap for multi-marker fitBounds (hubs spanning a corridor use a lower value). */
  fitMaxZoom?: number;
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

function teardropPinSvg(dark: boolean): string {
  const fill = dark ? "#9fd4d6" : "#6cb2b5";
  const stroke = dark ? "#1c3257" : "#f7fbfb";
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path fill="${fill}" stroke="${stroke}" stroke-width="2"
        d="M14 1C7.4 1 2 6.4 2 13c0 9.1 12 25 12 25s12-15.9 12-25C26 6.4 20.6 1 14 1z"/>
      <circle cx="14" cy="13" r="4.5" fill="${stroke}"/>
    </svg>`,
  );
}

function categoryPinHtml(iconName: string, dark: boolean): string {
  const bg = dark ? "#9fd4d6" : "#6cb2b5";
  const fg = dark ? "#1c3257" : "#ffffff";
  const tip = bg;
  const safeIcon = escapeHtml(iconName.replace(/[^a-z0-9_]/gi, "") || "storefront");
  return `<div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 2px 4px rgba(28,50,87,.28));">
  <div style="width:34px;height:34px;border-radius:9999px;background:${bg};border:2px solid ${dark ? "#1c3257" : "#ffffff"};display:flex;align-items:center;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:18px;line-height:1;color:${fg};font-variation-settings:'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 24;">${safeIcon}</span>
  </div>
  <div style="position:absolute;left:50%;bottom:1px;width:0;height:0;margin-left:-6px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid ${tip};"></div>
</div>`;
}

function markerPopupHtml(marker: BusinessMapMarker, dark: boolean): string {
  const href =
    (typeof marker.href === "string" && marker.href.trim()) ||
    `/business/${encodeURIComponent(marker.slug)}`;
  const titleColor = dark ? "#f4f4f5" : "#18181b";
  const subtitleColor = dark ? "#a1a1aa" : "#71717a";
  const imageUrl =
    typeof marker.imageUrl === "string" && marker.imageUrl.startsWith("http")
      ? marker.imageUrl.trim()
      : null;
  const subtitle =
    typeof marker.subtitle === "string" && marker.subtitle.trim()
      ? marker.subtitle.trim()
      : null;

  const imageBlock = imageUrl
    ? `<div class="whereto-map-popup__media">
  <img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
</div>`
    : "";

  const subtitleBlock = subtitle
    ? `<div class="whereto-map-popup__subtitle" style="color:${subtitleColor}">${escapeHtml(subtitle)}</div>`
    : "";

  return `<a href="${escapeHtml(href)}" class="whereto-map-popup__card">
  ${imageBlock}
  <div class="whereto-map-popup__body">
    <div class="whereto-map-popup__title" style="color:${titleColor}">${escapeHtml(marker.title)}</div>
    ${subtitleBlock}
  </div>
</a>`;
}

/**
 * OpenStreetMap via Leaflet — Carto Voyager (soft color) in light mode, dark_all in dark.
 * Multi-pin hubs use category Material Symbol chips when `marker.icon` is set.
 */
export function BusinessesOpenStreetMap({
  markers,
  className = "",
  zoom = 18,
  fitMaxZoom = 17,
}: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const [dark, setDark] = useState(false);
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState(false);
  const markersKey = markers
    .map(
      (m) =>
        `${m.id}:${m.lat}:${m.lng}:${m.icon ?? ""}:${m.href ?? ""}:${m.imageUrl ?? ""}:${m.subtitle ?? ""}`,
    )
    .join("|");

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
    let disableWheelZoom: (() => void) | null = null;
    setWheelZoomEnabled(false);

    async function mount() {
      const L = (await import("leaflet")).default;
      const el = containerRef.current;
      if (cancelled || !el) return;

      const defaultIcon = L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${teardropPinSvg(dark)}`,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -36],
      });

      const iconCache = new Map<string, import("leaflet").DivIcon>();
      function iconFor(marker: BusinessMapMarker) {
        const name = marker.icon?.trim();
        if (!name) return defaultIcon;
        const cached = iconCache.get(name);
        if (cached) return cached;
        const divIcon = L.divIcon({
          className: "whereto-map-cat-pin",
          html: categoryPinHtml(name, dark),
          iconSize: [36, 44],
          iconAnchor: [18, 44],
          popupAnchor: [0, -40],
        });
        iconCache.set(name, divIcon);
        return divIcon;
      }

      map = L.map(el, {
        // Page scroll wins until the user clicks the map.
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
        attribution: TILE_ATTR,
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const m of markers) {
        const latlng = L.latLng(m.lat, m.lng);
        bounds.extend(latlng);
        L.marker(latlng, { icon: iconFor(m) })
          .addTo(map)
          .bindPopup(markerPopupHtml(m, dark), {
            className: "whereto-map-popup",
            maxWidth: 280,
            minWidth: 220,
            closeButton: true,
          });
      }

      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], zoom);
      } else if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.08), { maxZoom: fitMaxZoom });
      }

      const enableWheelZoom = () => {
        map?.scrollWheelZoom.enable();
        setWheelZoomEnabled(true);
      };
      disableWheelZoom = () => {
        map?.scrollWheelZoom.disable();
        setWheelZoomEnabled(false);
      };

      map.on("click", enableWheelZoom);
      // Prefer container mouseleave — Leaflet mouseout fires when hovering markers/popups.
      el.addEventListener("mouseleave", disableWheelZoom);

      requestAnimationFrame(() => map?.invalidateSize());
    }

    void mount();

    return () => {
      cancelled = true;
      const el = containerRef.current;
      if (el && disableWheelZoom) el.removeEventListener("mouseleave", disableWheelZoom);
      map?.remove();
      map = null;
      mapRef.current = null;
    };
    // markersKey captures marker identity/coords without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, zoom, fitMaxZoom, mapId, dark]);

  if (markers.length === 0) return null;

  return (
    <div className="relative h-full min-h-80 w-full sm:min-h-[650px]">
      <div
        ref={containerRef}
        id={`businesses-map-${mapId}`}
        className={`h-full min-h-80 w-full bg-[var(--color-surface)] sm:min-h-[650px] ${className}`}
        role="img"
        aria-label="Map"
      />
      {!wheelZoomEnabled ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3"
          aria-hidden
        >
          <span className="rounded-md bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
            Click map to enable scroll zoom
          </span>
        </div>
      ) : null}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
