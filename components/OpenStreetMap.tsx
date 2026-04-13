type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
  title?: string;
};

/**
 * Functional OpenStreetMap component using a standard iframe embed.
 * No API key required.
 */
export function OpenStreetMap({ lat, lng, zoom = 15, className = "", title = "Map" }: Props) {
  // OSM embed URL format
  const bbox_delta = 0.005;
  const bbox = `${lng - bbox_delta},${lat - bbox_delta},${lng + bbox_delta},${lat + bbox_delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] shadow-premium-sm bg-[var(--color-surface-container-low)] ${className}`}>
      <iframe
        title={title}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        src={embedUrl}
      />
      <div className="absolute bottom-4 right-4 flex gap-2">
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-[var(--color-text-primary)] shadow-sm backdrop-blur-sm hover:bg-white transition-all"
        >
          View Larger Map
        </a>
      </div>
    </div>
  );
}
