/**
 * Small embedded map with a marker at the given coordinates. Uses OpenStreetMap's
 * keyless embed (no API key, no cost). Falls back to nothing if coords are missing.
 */
export function MapThumbnail({ lat, lng, height = 180 }: { lat?: number | null; lng?: number | null; height?: number }) {
  if (lat == null || lng == null) return null;
  const d = 0.004; // ~400 m box around the pin
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const maps = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <iframe
        title="Pinned location"
        src={src}
        loading="lazy"
        className="w-full"
        style={{ height, border: 0 }}
      />
      <a href={maps} target="_blank" rel="noreferrer"
        className="block bg-paper px-3 py-2 text-xs font-600 text-signal-600">
        📍 Open in Google Maps
      </a>
    </div>
  );
}
