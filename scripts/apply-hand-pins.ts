/**
 * One-shot: apply hand-looked lat/lng to Census no-match rows (by slug).
 *
 *   npx tsx scripts/apply-hand-pins.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { parseCsv, stringifyCsv } from "../lib/directory-audit/csv";

const FILE = "docs/businesses-audit-gemini.csv";

/** Exact slug → hand pin (operator lookup 2026-08-14). */
const PINS: Record<string, { lat: string; lng: string }> = {
  "neat-bottle-shop-and-tasting-room": { lat: "30.28448669350542", lng: "-86.02757056366309" },
  "mile-marker-fifteen-watersound": { lat: "30.301679977914432", lng: "-86.06408553354673" },
  "fleet-feet-watersound-town-center": { lat: "30.298054943128623", lng: "-86.02213585497748" },
  "fp-movement-watersound": { lat: "30.295897529045813", lng: "-86.0207084433365" },
  "hemline-watersound": { lat: "30.299842407694015", lng: "-86.01358939494222" },
  "monkees-watersound": { lat: "30.295888200761166", lng: "-86.0208908460477" },
  "faherty-grand-boulevard": { lat: "30.37940475480056", lng: "-86.31383812428872" },
  "j-jill": { lat: "30.378909863629044", lng: "-86.31443712127012" },
  "lululemon-grand-boulevard": { lat: "30.379038308124688", lng: "-86.31417986861038" },
  "sunset-shoes-and-lifestyles-grand-boulevard": {
    lat: "30.379618578323907",
    lng: "-86.31584045212283",
  },
  "the-beaufort-bonnet-company": { lat: "30.378724889978447", lng: "-86.31268245149921" },
  "tommy-bahama-grand-boulevard": { lat: "30.37928004291003", lng: "-86.3139694656147" },
  "tommy-bahama-restaurant-and-bar-sandestin": {
    lat: "30.37928004291003",
    lng: "-86.3139694656147",
  },
  "emerald-coast-chiropractic": { lat: "30.379573747037245", lng: "-86.31144633233946" },
  "amavida-coffee-roasters-seaside": { lat: "30.320638445626397", lng: "-86.13724180524362" },
  bankplus: { lat: "30.3795042103904", lng: "-86.31135908566313" },
  "kendra-scott-grand-boulevard": { lat: "30.37966666586698", lng: "-86.31135826846824" },
  "aquark-title-services": { lat: "30.379653721596075", lng: "-86.31145367031954" },
  "big-bad-breakfast-inlet-beach": { lat: "30.279449587171243", lng: "-86.01085293539846" },
  "gallions-restaurant-and-cocktail-lounge": {
    lat: "30.280626420544422",
    lng: "-86.0159221353984",
  },
  "cantina-laredo-modern-mexican": { lat: "30.37921683380386", lng: "-86.31224658196048" },
  "laco-seacrest-beach": { lat: "30.28188735404518", lng: "-86.01876832560868" },
  "tichelis-pizza": { lat: "30.281566584371973", lng: "-86.01863016053169" },
  "cafe-thirty-a": { lat: "30.31308225271285", lng: "-86.11117646846947" },
  "local-smoke-watersound": { lat: "30.30162528401543", lng: "-86.06397007032099" },
  "merit-alys-beach": { lat: "30.284673774333623", lng: "-86.02690014333675" },
  "cork-and-barrel-rosemary-beach": { lat: "30.281354386567475", lng: "-86.0137706214907" },
  arhaus: { lat: "30.379045534739394", lng: "-86.31224549815371" },
  bluemercury: { lat: "30.379016922621584", lng: "-86.31402811635037" },
  "la-luna-childrens-boutique": { lat: "30.37923111254709", lng: "-86.31164887587347" },
  "the-eye-gallery-grand-boulevard": { lat: "30.379592923169795", lng: "-86.31018564333495" },
  "williams-sonoma-grand-boulevard": { lat: "30.378926243885132", lng: "-86.31326554703756" },
  "coast-30a-watersound": { lat: "30.301955210439004", lng: "-86.06263085927868" },
  "live-well-30a-watersound": { lat: "30.301536105577917", lng: "-86.0634044610645" },
};

const rows = parseCsv(readFileSync(FILE, "utf8"));
let updated = 0;
const missing: string[] = [];

for (const [slug, pin] of Object.entries(PINS)) {
  const row = rows.find((r) => r.slug === slug);
  if (!row) {
    missing.push(slug);
    continue;
  }
  row.map_lat = pin.lat;
  row.map_lng = pin.lng;
  updated += 1;
  console.log(`${row.title}: ${pin.lat}, ${pin.lng}`);
}

writeFileSync(FILE, stringifyCsv(Object.keys(rows[0] ?? {}), rows), "utf8");
console.log(`\nUpdated ${updated}; missing slugs: ${missing.length ? missing.join(", ") : "none"}`);

console.log("\nOutside typical 30A corridor:");
for (const [slug, pin] of Object.entries(PINS)) {
  const lat = Number(pin.lat);
  const lng = Number(pin.lng);
  if (lat < 30.25 || lat > 30.42 || lng > -85.95 || lng < -86.4) {
    const row = rows.find((r) => r.slug === slug);
    console.log(`  ${row?.title ?? slug}: ${pin.lat}, ${pin.lng}`);
  }
}
