/** Meters between two WGS84 points (haversine). */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Sørensen–Dice on character bigrams (0–1). */
export function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x.length || !y.length) return 0;
  if (x === y) return 1;
  const bigrams = (s: string) => {
    const g: string[] = [];
    for (let i = 0; i < s.length - 1; i++) g.push(s.slice(i, i + 2));
    if (s.length === 1) g.push(s);
    return g;
  };
  const gx = bigrams(x);
  const gy = bigrams(y);
  const sety = new Map<string, number>();
  for (const g of gy) sety.set(g, (sety.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of gx) {
    const c = sety.get(g);
    if (c) {
      inter += 1;
      if (c <= 1) sety.delete(g);
      else sety.set(g, c - 1);
    }
  }
  return (2 * inter) / (gx.length + gy.length);
}

export type BusinessStub = {
  id: string;
  name: string;
  town_id: number | null;
  lat: number;
  lng: number;
  status: string;
};

export type DuplicatePair = {
  a: BusinessStub;
  b: BusinessStub;
  distanceM: number;
  nameSim: number;
};

export function findDuplicatePairs(
  rows: BusinessStub[],
  opts: { maxDistanceM: number; minNameSim: number },
): DuplicatePair[] {
  const byTown = new Map<number | string, BusinessStub[]>();
  for (const r of rows) {
    const k = r.town_id ?? "none";
    const list = byTown.get(k) ?? [];
    list.push(r);
    byTown.set(k, list);
  }
  const out: DuplicatePair[] = [];
  for (const list of byTown.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const d = distanceMeters(a.lat, a.lng, b.lat, b.lng);
        if (d > opts.maxDistanceM) continue;
        const sim = nameSimilarity(a.name, b.name);
        if (sim < opts.minNameSim) continue;
        out.push({ a, b, distanceM: d, nameSim: sim });
      }
    }
  }
  out.sort((p, q) => q.nameSim - p.nameSim || p.distanceM - q.distanceM);
  return out;
}
