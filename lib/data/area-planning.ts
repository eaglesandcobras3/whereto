import type { PlacePlanningProfile } from "@/lib/data/place-planning";

export const AREA_PLANNING: Record<string, PlacePlanningProfile> = {
  "rosemary-beach-town-center": {
    vibe: "Cobblestone loop of shops and restaurants — where Rosemary actually gathers.",
    bestFor: ["Walkable shopping", "Dinner without driving", "Evening strolls"],
    quickFacts: [
      { label: "Walkability", value: "High", icon: "directions_walk" },
      { label: "Beach", value: "Few blocks south", icon: "beach_access" },
      { label: "Crowds", value: "Busy weekends", icon: "groups" },
      { label: "Dining", value: "Walkable", icon: "restaurant" },
    ],
    beachAccess:
      "The town center sits inland from the sand. Beach access is a short walk south through neighborhood streets.",
    parking:
      "Town-center lots fill on summer weekends. Walking from your rental beats circling if you're staying nearby.",
    diningStyle:
      "Coffee to upscale dinner on foot. Most guests eat here multiple nights without getting in the car.",
    nearbyLinks: [
      { name: "Rosemary Beach", href: "/rosemary-beach", note: "Full town guide" },
      { name: "Inlet Beach", href: "/inlet-beach", note: "Quieter neighbor east" },
    ],
    relatedGuideSlugs: [
      "guide-to-rosemary-beach-florida",
      "public-beaches-30a",
      "ultimate-30a-first-timers-guide",
    ],
    faqs: [
      {
        question: "Can you walk to the beach from town center?",
        answer:
          "Yes, a few blocks south. Some rentals sit closer than others, so check your pin if walk-to-beach matters.",
      },
      {
        question: "When is town center busiest?",
        answer:
          "Summer evenings and holiday weekends. Mornings are calmer for coffee and browsing.",
      },
    ],
  },
  "seaside-town-center": {
    vibe: "The postcard square — pastel cottages, food windows, and the amphitheater lawn.",
    bestFor: ["First-time 30A visitors", "Family town-square energy", "Iconic photos"],
    quickFacts: [
      { label: "Walkability", value: "High", icon: "directions_walk" },
      { label: "Beach", value: "Short walk", icon: "beach_access" },
      { label: "Crowds", value: "Peak season busy", icon: "groups" },
      { label: "Dining", value: "On the square", icon: "restaurant" },
    ],
    beachAccess:
      "Central Square is a short walk from public beach access. Most visitors walk or bike from here.",
    parking:
      "Limited town parking. Biking or walking from your rental is easier than circling on busy Saturdays.",
    diningStyle:
      "Airstream tacos, sit-down restaurants, and sweets around the green. Go early or late to skip the crush.",
    nearbyLinks: [
      { name: "Seaside", href: "/seaside", note: "Full town guide" },
      { name: "WaterColor", href: "/watercolor", note: "Quieter neighbor" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "family-friendly-30a-beach-vacation",
      "public-beaches-30a",
    ],
    faqs: [
      {
        question: "Is Seaside town center crowded?",
        answer:
          "Peak weeks, yes — especially around meal times and events on the lawn. Weekday mornings are much calmer.",
      },
      {
        question: "Is this the same as the whole town?",
        answer:
          "It's the heart of Seaside, not the entire community. Most listings labeled Seaside are walkable from here.",
      },
    ],
  },
  "alys-beach-town-center": {
    vibe: "White-walled streets and polished dining inside Alys's curated loop.",
    bestFor: ["Upscale dinners", "Design-forward strolls", "Quiet evenings"],
    quickFacts: [
      { label: "Walkability", value: "High inside", icon: "directions_walk" },
      { label: "Beach", value: "Short walk", icon: "beach_access" },
      { label: "Crowds", value: "Moderate", icon: "groups" },
      { label: "Dining", value: "Reservations help", icon: "restaurant" },
    ],
    beachAccess:
      "Pedestrian paths connect the center to beach access inside the community. Most guests walk or bike.",
    parking:
      "Follow current guest parking rules for Alys. Staying inside the community means less daily driving.",
    diningStyle:
      "Polished restaurants and cocktail spots. Evenings feel like the main event.",
    nearbyLinks: [
      { name: "Alys Beach", href: "/alys-beach", note: "Full town guide" },
      { name: "Rosemary Beach", href: "/rosemary-beach", note: "More boutiques east" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
    ],
    faqs: [
      {
        question: "Do you need a reservation?",
        answer:
          "For popular restaurants in summer, yes. Book a few days ahead for weekend dinners.",
      },
      {
        question: "Is Alys town center open to visitors?",
        answer:
          "Public spaces and many storefronts welcome visitors. Some areas are residential — respect signage.",
      },
    ],
  },
  "inlet-beach-30avenue": {
    vibe: "Outdoor retail row with easy parking on the eastern end of 30A.",
    bestFor: ["Park-once shopping", "Casual family meals", "East-end errands"],
    quickFacts: [
      { label: "Walkability", value: "Along the strip", icon: "directions_walk" },
      { label: "Beach", value: "Short drive", icon: "beach_access" },
      { label: "Crowds", value: "Weekend busy", icon: "groups" },
      { label: "Dining", value: "Strip restaurants", icon: "restaurant" },
    ],
    beachAccess:
      "30Avenue is a shopping stop, not beachfront. The sand is a short drive or bike ride away.",
    parking:
      "Surface lots around the development. Easier than Rosemary or Seaside, but holiday weekends still fill.",
    diningStyle:
      "Breakfast through casual dinner along one walkable row. Good when you want one stop for the whole group.",
    nearbyLinks: [
      { name: "Inlet Beach", href: "/inlet-beach", note: "Full town guide" },
      { name: "Rosemary Beach", href: "/rosemary-beach", note: "Town center nearby" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "guide-to-rosemary-beach-florida",
    ],
    faqs: [
      {
        question: "What is 30Avenue?",
        answer:
          "A planned outdoor shopping and dining cluster in Inlet Beach. Handy for meals, gifts, and mid-trip errands.",
      },
      {
        question: "Is parking easier than Rosemary?",
        answer:
          "Generally yes. You still want to arrive before peak dinner hours on summer Saturdays.",
      },
    ],
  },
  "seacrest-peddlers-pavilion": {
    vibe: "Compact village of boutiques and casual dining in the middle of Seacrest.",
    bestFor: ["Lunch between beach and pool", "Neighborhood shopping", "Low-friction meals"],
    quickFacts: [
      { label: "Walkability", value: "Village loop", icon: "directions_walk" },
      { label: "Beach", value: "Short walk or drive", icon: "beach_access" },
      { label: "Crowds", value: "Moderate", icon: "groups" },
      { label: "Dining", value: "Casual", icon: "restaurant" },
    ],
    beachAccess:
      "Depends on your rental. Many guests walk or bike; others are a quick drive to preferred access.",
    parking:
      "Small lots. Walking from a nearby rental is easier than driving in for every meal.",
    diningStyle:
      "Casual lunch and early dinner. Strong when you want food close to home base without a big night out.",
    nearbyLinks: [
      { name: "Seacrest Beach", href: "/seacrest-beach", note: "Full town guide" },
      { name: "Rosemary Beach", href: "/rosemary-beach", note: "Upscale dining east" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "family-friendly-30a-beach-vacation",
      "public-beaches-30a",
    ],
    faqs: [
      {
        question: "Is Peddlers walkable from Rosemary?",
        answer:
          "From some rentals, yes. From others it's a short drive. Check your map pin before assuming.",
      },
      {
        question: "When is it busiest?",
        answer:
          "Summer lunch hours and early dinner. Weekday afternoons are calmer.",
      },
    ],
  },
  "watersound-big-chill": {
    vibe: "Food-hall hub where everyone picks their own thing — easy group nights.",
    bestFor: ["Picky eaters", "Weeknight dinners", "Kids who need room to move"],
    quickFacts: [
      { label: "Walkability", value: "Hub loop", icon: "directions_walk" },
      { label: "Beach", value: "Short drive", icon: "beach_access" },
      { label: "Crowds", value: "Dinner rush", icon: "groups" },
      { label: "Dining", value: "Food hall", icon: "restaurant" },
    ],
    beachAccess:
      "The Big Chill is inland from the beach. Plan a short drive or bike for sand time.",
    parking:
      "Shared lot for the hub. Peak dinner windows fill on perfect weather nights.",
    diningStyle:
      "Multiple stalls under one roof with outdoor seating. No single reservation for the whole group.",
    nearbyLinks: [
      { name: "WaterSound", href: "/watersound", note: "Full town guide" },
      { name: "Seagrove Beach", href: "/seagrove-beach", note: "Restaurant corridor" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "family-friendly-30a-beach-vacation",
    ],
    faqs: [
      {
        question: "Do you need reservations?",
        answer:
          "Usually no for the food hall itself. Individual stalls may have waits at peak dinner.",
      },
      {
        question: "Is it good with kids?",
        answer:
          "One of the easier group dinners on 30A. Outdoor space and variety help when everyone wants something different.",
      },
    ],
  },
  "grayton-central": {
    vibe: "Main parking lot and shuttle hub — plus coffee and shops before you hit the beach strip.",
    bestFor: ["Beach-day parking", "Shuttle into Grayton", "Morning coffee runs"],
    quickFacts: [
      { label: "Walkability", value: "Parking hub", icon: "directions_walk" },
      { label: "Beach", value: "Shuttle to sand", icon: "beach_access" },
      { label: "Crowds", value: "Busy beach days", icon: "groups" },
      { label: "Dining", value: "Coffee + casual", icon: "restaurant" },
    ],
    beachAccess:
      "Park here and take the free shuttle into the historic beach district. Less circling in tight lanes.",
    parking:
      "This is the main public lot for Grayton Beach days. Arrive early on summer weekends.",
    diningStyle:
      "Black Bear Bread and nearby spots for breakfast. Dinner is usually farther toward the beach strip.",
    nearbyLinks: [
      { name: "Grayton Beach", href: "/grayton-beach", note: "Full town guide" },
    ],
    relatedGuideSlugs: [
      "public-beaches-30a",
      "ultimate-30a-first-timers-guide",
    ],
    faqs: [
      {
        question: "Where do you park for Grayton Beach?",
        answer:
          "Grayton Central is the main public lot north of 30A on Highway 283, with shuttle service to the beach district.",
      },
      {
        question: "Is this the same as downtown Grayton?",
        answer:
          "No. Central is the parking hub. The classic strip with Red Bar and Chiringo is closer to the sand.",
      },
    ],
  },
  "sandestin-grand-boulevard": {
    vibe: "Outdoor shopping street with movies, national retail, and big-lot parking.",
    bestFor: ["Rainy-day backup", "Errands and movies", "Destin-area convenience"],
    quickFacts: [
      { label: "Walkability", value: "Main street", icon: "directions_walk" },
      { label: "Beach", value: "Drive to sand", icon: "beach_access" },
      { label: "Crowds", value: "Weekend busy", icon: "groups" },
      { label: "Dining", value: "Wide variety", icon: "restaurant" },
    ],
    beachAccess:
      "Shopping district, not beachfront. Beach is a short drive toward the gulf.",
    parking:
      "Large shared lots. Movie and dinner times stack up on holiday weekends.",
    diningStyle:
      "Chain and local mix — good for covering different tastes in one trip.",
    nearbyLinks: [
      { name: "Sandestin", href: "/sandestin", note: "Full town guide" },
      { name: "Miramar Beach", href: "/miramar-beach", note: "Beach strip west" },
    ],
    relatedGuideSlugs: [
      "how-far-is-30a-from-destin",
      "ultimate-30a-first-timers-guide",
    ],
    faqs: [
      {
        question: "Is Grand Boulevard inside Sandestin resort?",
        answer:
          "It's Sandestin's main outdoor retail center. Some areas feel resort-adjacent; parking is shared.",
      },
      {
        question: "Worth it from mid-30A?",
        answer:
          "Best when you need something you cannot find in a beach town — movies, big retail, or a rainy afternoon.",
      },
    ],
  },
  "panama-city-beach-pier-park": {
    vibe: "Large open-air district with national anchors, pier energy, and PCB scale.",
    bestFor: ["One-stop shopping", "Rainy days", "Big-night-out energy"],
    quickFacts: [
      { label: "Walkability", value: "Open-air mall", icon: "directions_walk" },
      { label: "Beach", value: "Near the pier", icon: "beach_access" },
      { label: "Crowds", value: "Summer packed", icon: "groups" },
      { label: "Dining", value: "Strip variety", icon: "restaurant" },
    ],
    beachAccess:
      "Close to the pier and front-beach zone. Some visitors park here and walk to the sand.",
    parking:
      "Multiple lots along the district. Events and holidays fill fast near the main strip.",
    diningStyle:
      "Everything from casual chains to seafood on the strip. Built for volume, not intimacy.",
    nearbyLinks: [
      { name: "Panama City Beach", href: "/panama-city-beach", note: "Full town guide" },
    ],
    relatedGuideSlugs: [
      "how-to-get-to-30a-florida",
      "ultimate-30a-first-timers-guide",
    ],
    faqs: [
      {
        question: "How far is Pier Park from 30A?",
        answer:
          "About 45–60 minutes depending on traffic. Most mid-30A visitors only come for a specific errand or day trip.",
      },
      {
        question: "Is Pier Park on the beach?",
        answer:
          "Near the pier and tourist strip, but it's a shopping district first. Beach access is walkable from parts of the complex.",
      },
    ],
  },
};

export function getAreaPlanningProfile(slug: string): PlacePlanningProfile | null {
  return AREA_PLANNING[slug] ?? null;
}
