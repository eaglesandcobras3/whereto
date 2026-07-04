/** Per-town planning attributes for differentiated town-page templates. */
export type TownPlanningProfile = {
  bestFor: string[];
  beachAccess: string;
  parking: string;
  diningStyle?: string;
  nearbyTowns?: Array<{ name: string; slug: string; note?: string }>;
  relatedGuideSlugs?: string[];
  faqs?: Array<{ question: string; answer: string }>;
};

export const TOWN_PLANNING: Record<string, TownPlanningProfile> = {
  seaside: {
    bestFor: ["Families", "First-time 30A visitors", "Walkable town-center vacations"],
    beachAccess:
      "Public beach access points sit within a short walk of the town center. Most visitors park once and walk to the sand from their rental or the central lots.",
    parking:
      "Peak weeks fill central parking quickly. Arrive early for beach days or plan to bike from your rental — Seaside is built for walking.",
    diningStyle: "Casual Gulf-front spots, pizza on the green, and upscale options around the town center.",
    nearbyTowns: [
      { name: "WaterColor", slug: "watercolor", note: "Quieter, resort-style neighbor" },
      { name: "Seagrove Beach", slug: "seagrove-beach", note: "More low-key, central on the corridor" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "family-friendly-30a-beach-vacation",
    ],
    faqs: [
      {
        question: "Is Seaside walkable?",
        answer:
          "Yes — Seaside is one of the most walkable towns on 30A, with shops, dining, and beach access reachable on foot from most rentals.",
      },
      {
        question: "Is Seaside good for families?",
        answer:
          "Families love the town green, easy beach access, and compact layout. Crowds peak in summer, so book early for popular weeks.",
      },
    ],
  },
  "inlet-beach": {
    bestFor: ["Quieter stays", "Camp Helen day trips", "Eastern 30A access"],
    beachAccess:
      "Wide beaches and fewer high-rises than mid-corridor towns. Access points are spread along the eastern end of 30A.",
    parking:
      "Generally easier than Seaside or Rosemary in peak season, though holiday weekends still fill up near popular access points.",
    diningStyle: "Neighborhood cafes, 30Avenue dining, and quick drives to Rosemary or Alys for a bigger night out.",
    nearbyTowns: [
      { name: "Rosemary Beach", slug: "rosemary-beach", note: "Walkable boutiques and dining" },
      { name: "Alys Beach", slug: "alys-beach", note: "Architectural contrast, upscale dining" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "guide-to-rosemary-beach-florida",
    ],
    faqs: [
      {
        question: "How is Inlet Beach different from Rosemary Beach?",
        answer:
          "Inlet Beach is quieter and more residential, with wider beaches and a laid-back pace. Rosemary is denser, more walkable, and built around a town center.",
      },
      {
        question: "What is 30Avenue?",
        answer:
          "30Avenue is a local shopping and dining cluster in Inlet Beach — a practical stop for groceries, coffee, and casual meals.",
      },
    ],
  },
  "rosemary-beach": {
    bestFor: ["Walkability", "Boutique shopping", "Date nights and girls trips"],
    beachAccess: "Beach access is a short walk from the town center; some rentals sit closer to the sand than others.",
    parking: "Town-center parking is limited on busy weekends — biking or walking from your rental is often easier.",
    nearbyTowns: [
      { name: "Inlet Beach", slug: "inlet-beach" },
      { name: "Alys Beach", slug: "alys-beach" },
    ],
    relatedGuideSlugs: ["guide-to-rosemary-beach-florida", "bachelorette-girls-trip-30a"],
  },
};

export function getTownPlanningProfile(slug: string): TownPlanningProfile | null {
  return TOWN_PLANNING[slug] ?? null;
}
