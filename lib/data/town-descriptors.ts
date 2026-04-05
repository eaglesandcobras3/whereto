/** Short editorial lines for town cards / supporting copy. */
export const TOWN_DESCRIPTOR: Record<string, string> = {
  "rosemary-beach": "New Urbanism charm, walkable squares, and refined dining.",
  seaside: "Iconic pastel cottages, the town center, and beach-town energy.",
  "alys-beach": "Mediterranean white walls, calm courtyards, and quiet luxury.",
  "grayton-beach": "Artistic, laid-back, and the gateway to Grayton Beach State Park.",
  watercolor: "Family neighborhoods, pools, and easy access to Seaside.",
  "santa-rosa-beach": "Broader 30A stretch — beaches, dining, and local staples.",
  "inlet-beach": "East end calm, close to Rosemary and the eastern dunes.",
  "seacrest-beach": "Residential calm with lagoon pools and beach access.",
  watersound: "Gated quiet, dunes, and a more private coastal feel.",
  "blue-mountain-beach": "Highest point on the Gulf — sunset views and low density.",
};

export function getTownDescriptor(slug: string): string {
  return TOWN_DESCRIPTOR[slug] ?? "Curated picks, local rhythm, and beach-town character.";
}
