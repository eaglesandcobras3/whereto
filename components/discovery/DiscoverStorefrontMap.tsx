"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { DiscoverBbox } from "@/lib/discovery-filters/discover-bbox";
import {
  roundDiscoverCoord,
  serializeDiscoverBbox,
} from "@/lib/discovery-filters/discover-bbox";
import type { DiscoverListingRow } from "@/lib/discovery-filters/types";
import { leafCategoryIcon } from "@/lib/categories/unified-browse";
import { DEFAULT_MAP_CENTER } from "@/components/maps/MapLocationPicker";
import "leaflet/dist/leaflet.css";

export type DiscoverMapViewport = {
  bbox: DiscoverBbox;
  zoom: number;
};

type Props = {
  listings: DiscoverListingRow[];
  /** URL-driven viewport — restores the map when present. */
  initialBbox?: DiscoverBbox | null;
  initialZoom?: number;
  /** Called when the user asks to search the current map area (Google-style). */
  onSearchArea: (viewport: DiscoverMapViewport) => void;
  /** Soft loading indicator while listings refetch. */
  refreshing?: boolean;
  /** Map chrome overlays (e.g. town jump) — rendered above the tile pane. */
  children?: ReactNode;
  className?: string;
};

const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const DEFAULT_ZOOM = 12;

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

function markerPopupHtml(listing: DiscoverListingRow, dark: boolean): string {
  const href = `/business/${encodeURIComponent(listing.slug)}`;
  const titleColor = dark ? "#f4f4f5" : "#18181b";
  const subtitleColor = dark ? "#a1a1aa" : "#71717a";
  const imageUrl =
    typeof listing.hero_image_url === "string" && listing.hero_image_url.startsWith("http")
      ? listing.hero_image_url.trim()
      : null;
  const subtitle = listing.town_name?.trim() || null;

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
    <div class="whereto-map-popup__title" style="color:${titleColor}">${escapeHtml(listing.title)}</div>
    ${subtitleBlock}
  </div>
</a>`;
}

function boundsFromMap(map: import("leaflet").Map): DiscoverMapViewport {
  const b = map.getBounds();
  return {
    bbox: {
      south: roundDiscoverCoord(b.getSouth()),
      west: roundDiscoverCoord(b.getWest()),
      north: roundDiscoverCoord(b.getNorth()),
      east: roundDiscoverCoord(b.getEast()),
    },
    zoom: map.getZoom(),
  };
}

function viewportKey(bbox: DiscoverBbox | null | undefined, zoom: number | undefined): string {
  if (!bbox) return `none:${zoom ?? ""}`;
  return `${serializeDiscoverBbox(bbox)}:${zoom ?? ""}`;
}

/**
 * Storefront discover map — Google-like “Search this area” after pan/zoom.
 * Viewport restores from URL `bbox`/`zoom`; searching writes those params.
 */
export function DiscoverStorefrontMap({
  listings,
  initialBbox,
  initialZoom,
  onSearchArea,
  refreshing = false,
  children,
  className = "",
}: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onSearchAreaRef = useRef(onSearchArea);
  const appliedViewportRef = useRef(viewportKey(initialBbox, initialZoom));
  const [dark, setDark] = useState(false);
  const [areaDirty, setAreaDirty] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  onSearchAreaRef.current = onSearchArea;

  const mappable = useMemo(
    () =>
      listings.filter(
        (l) =>
          l.map_lat != null &&
          l.map_lng != null &&
          Number.isFinite(l.map_lat) &&
          Number.isFinite(l.map_lng),
      ),
    [listings],
  );

  const markersKey = mappable
    .map((m) => `${m.id}:${m.map_lat}:${m.map_lng}:${m.category_slug ?? ""}`)
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

  // Mount map once.
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function mount() {
      const L = (await import("leaflet")).default;
      const el = containerRef.current;
      if (cancelled || !el) return;

      const startZoom = initialZoom ?? DEFAULT_ZOOM;
      const startCenter = initialBbox
        ? L.latLng(
            (initialBbox.south + initialBbox.north) / 2,
            (initialBbox.west + initialBbox.east) / 2,
          )
        : L.latLng(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng);

      map = L.map(el, {
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView(startCenter, startZoom);
      mapRef.current = map;

      L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
        attribution: TILE_ATTR,
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);

      if (initialBbox && initialZoom != null) {
        map.setView(
          L.latLng(
            (initialBbox.south + initialBbox.north) / 2,
            (initialBbox.west + initialBbox.east) / 2,
          ),
          initialZoom,
        );
      } else if (initialBbox) {
        map.fitBounds(
          L.latLngBounds(
            [initialBbox.south, initialBbox.west],
            [initialBbox.north, initialBbox.east],
          ),
          { animate: false, maxZoom: 16 },
        );
      }

      const markDirty = () => setAreaDirty(true);
      map.on("moveend", markDirty);
      map.on("zoomend", markDirty);

      setMapReady(true);
      requestAnimationFrame(() => map?.invalidateSize());
    }

    void mount();

    return () => {
      cancelled = true;
      setMapReady(false);
      map?.remove();
      map = null;
      mapRef.current = null;
      markersLayerRef.current = null;
    };
    // Mount once per dark mode (tile set); viewport restore handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, dark]);

  // Restore viewport when URL bbox/zoom changes (not from our own search click).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const nextKey = viewportKey(initialBbox, initialZoom);
    if (nextKey === appliedViewportRef.current) return;
    appliedViewportRef.current = nextKey;

    void import("leaflet").then((mod) => {
      const Leaflet = mod.default;
      if (!mapRef.current) return;
      if (initialBbox && initialZoom != null) {
        // Town jumps / URL restores: honor zoom so we don't undershoot via fitBounds.
        mapRef.current.setView(
          Leaflet.latLng(
            (initialBbox.south + initialBbox.north) / 2,
            (initialBbox.west + initialBbox.east) / 2,
          ),
          initialZoom,
          { animate: false },
        );
      } else if (initialBbox) {
        mapRef.current.fitBounds(
          Leaflet.latLngBounds(
            [initialBbox.south, initialBbox.west],
            [initialBbox.north, initialBbox.east],
          ),
          { animate: false, maxZoom: 16 },
        );
      } else if (initialZoom != null) {
        mapRef.current.setZoom(initialZoom, { animate: false });
      }
      setAreaDirty(false);
    });
  }, [initialBbox, initialZoom, mapReady]);

  // Sync markers when listings change — do not remount the map.
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer || !mapReady) return;

    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || !markersLayerRef.current) return;

      markersLayerRef.current.clearLayers();

      const defaultIcon = L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${teardropPinSvg(dark)}`,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -36],
      });
      const iconCache = new Map<string, import("leaflet").DivIcon>();

      for (const listing of mappable) {
        const iconName = listing.category_slug
          ? leafCategoryIcon(listing.category_slug)
          : null;
        let markerIcon: import("leaflet").Icon | import("leaflet").DivIcon = defaultIcon;
        if (iconName) {
          const cached = iconCache.get(iconName);
          if (cached) {
            markerIcon = cached;
          } else {
            const divIcon = L.divIcon({
              className: "whereto-map-cat-pin",
              html: categoryPinHtml(iconName, dark),
              iconSize: [36, 44],
              iconAnchor: [18, 44],
              popupAnchor: [0, -40],
            });
            iconCache.set(iconName, divIcon);
            markerIcon = divIcon;
          }
        }

        L.marker([listing.map_lat as number, listing.map_lng as number], { icon: markerIcon })
          .addTo(markersLayerRef.current!)
          .bindPopup(markerPopupHtml(listing, dark), {
            className: "whereto-map-popup",
            maxWidth: 280,
            minWidth: 220,
            closeButton: true,
          });
      }

      // First load without bbox: frame the corridor pins once.
      if (!initialBbox && mappable.length > 0 && !areaDirty) {
        const bounds = L.latLngBounds(
          mappable.map((m) => [m.map_lat as number, m.map_lng as number] as [number, number]),
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.08), { maxZoom: 14, animate: false });
          setAreaDirty(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // intentionally omit areaDirty / initialBbox from remounting markers constantly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, mapReady, dark]);

  const searchThisArea = () => {
    const map = mapRef.current;
    if (!map) return;
    const viewport = boundsFromMap(map);
    appliedViewportRef.current = viewportKey(viewport.bbox, viewport.zoom);
    setAreaDirty(false);
    onSearchAreaRef.current(viewport);
  };

  return (
    <div className={`relative h-full min-h-[28rem] w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}>
      <div
        ref={containerRef}
        id={`discover-map-${mapId}`}
        className="h-full min-h-[28rem] w-full"
        role="img"
        aria-label="Discover map"
      />
      {!mapReady ? (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-[var(--color-surface-muted)]/80">
          <span className="inline-flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
            <span
              className="inline-block size-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
              aria-hidden
            />
            Loading map…
          </span>
        </div>
      ) : null}
      {refreshing ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-900/75 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
            <span
              className="inline-block size-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            Updating pins…
          </span>
        </div>
      ) : null}
      {areaDirty && !refreshing ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
          <button
            type="button"
            onClick={searchThisArea}
            className="pointer-events-auto rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-95"
          >
            Search this area
          </button>
        </div>
      ) : null}
      {mapReady && mappable.length === 0 && !refreshing ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[500] flex justify-center px-3">
          <span className="rounded-md bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
            No mapped storefronts in these results
          </span>
        </div>
      ) : null}
      {children}
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
