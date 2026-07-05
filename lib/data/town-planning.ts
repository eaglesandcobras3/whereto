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
    bestFor: ["Families with young kids", "Your first 30A trip", "A rental where you walk to dinner"],
    beachAccess:
      "Most rentals in Seaside put you a short walk from the sand. Public access points branch off the main streets, and on a normal beach day you rarely need the car once you're checked in.",
    parking:
      "Summer Saturdays fill up fast. If you're driving to the beach, get there before 10 or plan to walk from the house. Biking from your rental is usually easier than circling the lots.",
    diningStyle:
      "Pizza and tacos on the town green, a few Gulf-front tables for sunset, and nicer spots when you want a real sit-down night out.",
    nearbyTowns: [
      { name: "WaterColor", slug: "watercolor", note: "Quieter neighbor, good for bike paths and resort pools" },
      { name: "Seagrove Beach", slug: "seagrove-beach", note: "More low-key, right in the middle of the corridor" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "family-friendly-30a-beach-vacation",
    ],
    faqs: [
      {
        question: "Can you walk everywhere in Seaside?",
        answer:
          "For a typical week, mostly yes. Coffee, the beach, and dinner are walkable from most rentals. You'll still want a car for a Publix run or a day exploring farther west on 30A.",
      },
      {
        question: "Is Seaside good with kids?",
        answer:
          "It's one of the easier towns for families. The green gives them space to run around, beach access is close, and you're not loading everyone into the car for every meal.",
      },
    ],
  },
  "inlet-beach": {
    bestFor: ["A quieter base", "Camp Helen day trips", "Staying on the eastern end of 30A"],
    beachAccess:
      "The beaches here feel wider and less built-up than mid-corridor towns. Access points are spaced along the eastern stretch, and you're usually a short walk or bike ride from the sand.",
    parking:
      "Still busy on holiday weekends, but nothing like Seaside or Rosemary on a July Saturday. Most weeks you can find a spot without the full parking-lot shuffle.",
    diningStyle:
      "Neighborhood spots around 30Avenue for coffee and casual meals. For a bigger night out, Rosemary and Alys are a quick drive east.",
    nearbyTowns: [
      { name: "Rosemary Beach", slug: "rosemary-beach", note: "Walkable boutiques and a real town center" },
      { name: "Alys Beach", slug: "alys-beach", note: "White stucco and a totally different feel" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "guide-to-rosemary-beach-florida",
    ],
    faqs: [
      {
        question: "How is Inlet Beach different from Rosemary?",
        answer:
          "Inlet Beach is sleepier and more residential. Rosemary has the cobblestone center, the shops, and the energy. Same coastline, very different pace.",
      },
      {
        question: "What is 30Avenue?",
        answer:
          "A small cluster of shops and restaurants in Inlet Beach. Handy for groceries, coffee, and a casual lunch without driving into Rosemary.",
      },
    ],
  },
  "rosemary-beach": {
    bestFor: ["Walking to dinner", "Boutique shopping", "Girls weekends and date nights"],
    beachAccess:
      "Beach access is a few blocks from the town center. Some rentals sit closer to the sand than others, so check the map before you book if walk-to-beach matters.",
    parking:
      "Town-center parking gets tight on busy weekends. If your rental is in the core, walking or biking beats driving and hunting for a spot.",
    diningStyle:
      "Walkable restaurants from casual to upscale. Easy to split the week between pool afternoons and a dressed-up dinner without getting in the car.",
    nearbyTowns: [
      { name: "Inlet Beach", slug: "inlet-beach", note: "Quieter beaches, less foot traffic" },
      { name: "Alys Beach", slug: "alys-beach", note: "Five minutes east, completely different architecture" },
    ],
    relatedGuideSlugs: ["guide-to-rosemary-beach-florida", "bachelorette-girls-trip-30a"],
    faqs: [
      {
        question: "Is Rosemary Beach walkable?",
        answer:
          "That's the main reason people book here. Shops, restaurants, and most beach access are on foot from the center. You might still drive for groceries or a beach day farther west.",
      },
      {
        question: "Is Rosemary good for a girls trip?",
        answer:
          "It's a popular pick. Walkable dining, cute photo spots, and enough going on that you don't need a packed itinerary every day.",
      },
    ],
  },
};

export function getTownPlanningProfile(slug: string): TownPlanningProfile | null {
  return TOWN_PLANNING[slug] ?? null;
}
