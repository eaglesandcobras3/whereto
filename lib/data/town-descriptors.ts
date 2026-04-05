/** Short editorial lines for town cards / supporting copy. */
export const TOWN_DESCRIPTOR: Record<string, string> = {
  // Original 30A towns
  "rosemary-beach":
    "European-style Dutch West Indies architecture, cobblestone streets, and manicured parks.",
  seaside:
    "The iconic new-urbanist town with pastel houses, walkability, and The Truman Show filming location.",
  "alys-beach":
    "Stunning white Mediterranean-inspired architecture and luxury walkable streets.",
  "grayton-beach":
    "One of the oldest communities with a bohemian 'Old Florida' vibe, plus a state park.",
  watercolor:
    "Master-planned community known for family-friendly, upscale amenities.",
  "santa-rosa-beach":
    "The broader area encompassing several smaller communities, including Gulf Place and Point Washington.",
  "inlet-beach":
    "The easternmost town with a quiet, laid-back vibe and proximity to Camp Helen State Park.",
  "seacrest-beach":
    "Known for its large lagoon pool and close proximity to both Alys and Rosemary Beach.",
  watersound:
    "A gated coastal community with distinctive shingle-style architecture.",
  "blue-mountain-beach":
    "Highest elevation on the Gulf Coast and home to rare blue lupine flowers.",

  // New 30A communities
  "dune-allen-beach":
    "Known for its quiet atmosphere and numerous coastal dune lakes.",
  "gulf-place":
    "A colorful, laid-back community with shopping, dining, and Artists at Gulf Place.",
  "seagrove-beach":
    "A mix of old and new, offering a central location with plenty of shops and cafes.",
  prominence:
    "A community featuring 'The Hub,' a popular dining and entertainment venue.",

  // Destin / Miramar region
  destin:
    "The 'World's Luckiest Fishing Village' — charter boats, outlet shopping, and family attractions.",
  "miramar-beach":
    "Upscale beach community bridging Destin and 30A with premier dining and Silver Sands outlets.",
  sandestin:
    "A sprawling resort community with golf, marina, and the Village of Baytowne Wharf.",

  // Panama City Beach
  "panama-city-beach":
    "A lively beach destination known for its nightlife, family attractions, and miles of white sand.",
};

export function getTownDescriptor(slug: string): string {
  return (
    TOWN_DESCRIPTOR[slug] ?? "Curated picks, local rhythm, and beach-town character."
  );
}

/** Region descriptors for region hub pages */
export const REGION_DESCRIPTOR: Record<string, string> = {
  "30a":
    "A scenic 24-mile stretch of Highway 30A featuring charming beach towns, coastal dune lakes, and some of Florida's most beautiful beaches.",
  "destin-miramar":
    "Premier Emerald Coast destinations with world-class fishing, outlet shopping, and upscale resort communities.",
  "panama-city-beach":
    "A vibrant beach city offering family attractions, nightlife, and miles of pristine Gulf coastline.",
};

export function getRegionDescriptor(slug: string): string {
  return REGION_DESCRIPTOR[slug] ?? "Discover the best of Florida's Emerald Coast.";
}
