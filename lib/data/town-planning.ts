/** Per-town planning attributes — scannable “profile” content for town pages. */
export type TownQuickFact = {
  label: string;
  value: string;
  icon: string;
};

export type TownPlanningProfile = {
  /** One-line summary, like an Airbnb listing subtitle. */
  vibe: string;
  bestFor: string[];
  quickFacts: TownQuickFact[];
  beachAccess: string;
  parking: string;
  diningStyle?: string;
  nearbyTowns?: Array<{ name: string; slug: string; note?: string }>;
  relatedGuideSlugs?: string[];
  faqs?: Array<{ question: string; answer: string }>;
};

export const TOWN_PLANNING: Record<string, TownPlanningProfile> = {
  "inlet-beach": {
    vibe: "Quieter eastern 30A with wide beaches and a more residential feel.",
    bestFor: ["A quieter base", "Camp Helen day trips", "Wide beaches without high-rises"],
    quickFacts: [
      { label: "Walkability", value: "Moderate", icon: "directions_walk" },
      { label: "Beach", value: "Short walk or bike", icon: "beach_access" },
      { label: "Crowds", value: "Lighter than Rosemary", icon: "groups" },
      { label: "Dining", value: "30Avenue + short drives", icon: "restaurant" },
    ],
    beachAccess:
      "Wide beaches and fewer towers than mid-corridor towns. Most rentals put you a short walk or bike ride from access points along the eastern stretch.",
    parking:
      "Holiday weekends still fill up, but most weeks you avoid the Seaside-level parking shuffle. Arrive early on peak Saturdays if you're driving to the sand.",
    diningStyle:
      "Coffee and casual meals around 30Avenue. Rosemary and Alys are a quick drive when you want a bigger night out.",
    nearbyTowns: [
      { name: "Rosemary Beach", slug: "rosemary-beach", note: "Walkable boutiques and town center" },
      { name: "Alys Beach", slug: "alys-beach", note: "White stucco, totally different vibe" },
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
          "Inlet Beach is sleepier and more residential. Rosemary has the cobblestone center and the foot traffic. Same coastline, different pace.",
      },
      {
        question: "What is 30Avenue?",
        answer:
          "A small cluster of shops and restaurants in Inlet Beach. Good for groceries, coffee, and a casual lunch without driving into Rosemary.",
      },
    ],
  },
  "rosemary-beach": {
    vibe: "Cobblestone walks, boutique shopping, and dinner on foot.",
    bestFor: ["Walking to dinner", "Boutique shopping", "Girls weekends and date nights"],
    quickFacts: [
      { label: "Walkability", value: "High", icon: "directions_walk" },
      { label: "Beach", value: "Few blocks from center", icon: "beach_access" },
      { label: "Crowds", value: "Busy weekends", icon: "groups" },
      { label: "Dining", value: "Walkable", icon: "restaurant" },
    ],
    beachAccess:
      "Beach access is a few blocks from the town center. Some rentals sit closer to the sand than others, so check the map if walk-to-beach is a dealbreaker.",
    parking:
      "Town-center parking gets tight on busy weekends. If you're in the core, walking or biking beats circling for a spot.",
    diningStyle:
      "Walkable from casual to upscale. Easy to split pool afternoons and a dressed-up dinner without getting in the car.",
    nearbyTowns: [
      { name: "Inlet Beach", slug: "inlet-beach", note: "Quieter beaches, less foot traffic" },
      { name: "Alys Beach", slug: "alys-beach", note: "Five minutes east, different architecture" },
    ],
    relatedGuideSlugs: ["guide-to-rosemary-beach-florida", "bachelorette-girls-trip-30a"],
    faqs: [
      {
        question: "Is Rosemary Beach walkable?",
        answer:
          "That's the main draw. Shops, restaurants, and most beach access are on foot from the center. You'll still drive for groceries or a beach day farther west.",
      },
      {
        question: "Is Rosemary good for a girls trip?",
        answer:
          "Popular pick. Walkable dining, photo spots, and enough going on that you don't need a packed itinerary every day.",
      },
    ],
  },
  "alys-beach": {
    vibe: "White walls, calm courtyards, and a polished pace that feels intentionally quiet.",
    bestFor: ["Design lovers", "Upscale quiet weeks", "Photo-worthy architecture"],
    quickFacts: [
      { label: "Walkability", value: "High inside town", icon: "directions_walk" },
      { label: "Beach", value: "Short walk", icon: "beach_access" },
      { label: "Crowds", value: "Moderate", icon: "groups" },
      { label: "Dining", value: "Reservations help", icon: "restaurant" },
    ],
    beachAccess:
      "Pedestrian-friendly layout with controlled access points. Most guests walk or bike to the beach from inside the community.",
    parking:
      "Limited town-center parking in peak season. Staying inside Alys means you rarely need the car for dinner.",
    diningStyle:
      "Polished restaurants where reservations matter in summer. More event-like dinners than grab-and-go beach food.",
    nearbyTowns: [
      { name: "Rosemary Beach", slug: "rosemary-beach", note: "More nightlife and boutiques" },
      { name: "Seacrest Beach", slug: "seacrest-beach", note: "Quieter residential stretch" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "bachelorette-girls-trip-30a",
      "public-beaches-30a",
    ],
    faqs: [
      {
        question: "Is Alys Beach walkable?",
        answer:
          "Inside the community, yes. It's built for walking and biking. You'll still drive for groceries or exploring other towns along 30A.",
      },
      {
        question: "Is Alys Beach family-friendly?",
        answer:
          "Families stay here, but the vibe leans quieter and more polished than Seaside or Grayton. Great if you want calm; less ideal if you want a busy town green.",
      },
    ],
  },
  "seacrest-beach": {
    vibe: "Residential stretch between Rosemary and Alys with lagoon pools and a calmer soundtrack.",
    bestFor: ["Families who want pools", "Staying near polished towns", "Quieter nights"],
    quickFacts: [
      { label: "Walkability", value: "Varies by rental", icon: "directions_walk" },
      { label: "Beach", value: "Walk or short drive", icon: "beach_access" },
      { label: "Crowds", value: "Quieter than neighbors", icon: "groups" },
      { label: "Dining", value: "Drive to Rosemary/Alys", icon: "restaurant" },
    ],
    beachAccess:
      "Depends where you land. Some rentals walk to Rosemary or the beach; others are a short drive. Check the pin before you book.",
    parking:
      "Residential streets are easier than town centers. Peak weeks add bike and foot traffic on paths between towns.",
    diningStyle:
      "Mostly residential. Plan to walk or drive east to Rosemary and Alys for restaurants, or west toward Seagrove.",
    nearbyTowns: [
      { name: "Rosemary Beach", slug: "rosemary-beach", note: "Walkable dining for many rentals" },
      { name: "Alys Beach", slug: "alys-beach", note: "Upscale dinners close by" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "family-friendly-30a-beach-vacation",
      "public-beaches-30a",
    ],
    faqs: [
      {
        question: "Can you walk to Rosemary from Seacrest?",
        answer:
          "From some rentals, yes. From others it's a stretch. The map pin matters more here than in a single-square town.",
      },
      {
        question: "What is the lagoon pool?",
        answer:
          "A large shared lagoon pool system in Seacrest. Popular with families when beach days need a break.",
      },
    ],
  },
  watersound: {
    vibe: "Tree-lined streets and a tucked-away feel between the busier town centers.",
    bestFor: ["Privacy", "Calm mornings", "Residential neighborhood stays"],
    quickFacts: [
      { label: "Walkability", value: "Low inside", icon: "directions_walk" },
      { label: "Beach", value: "Short drive or bike", icon: "beach_access" },
      { label: "Crowds", value: "Quiet", icon: "groups" },
      { label: "Dining", value: "Drive to Seagrove", icon: "restaurant" },
    ],
    beachAccess:
      "No dense town center here. Beach access is a short bike ride or drive depending on where you're staying.",
    parking:
      "Neighborhood parking is straightforward. You'll use the car more for dining and errands than in Seaside or Rosemary.",
    diningStyle:
      "Plan dinners in Seagrove, Seaside, or Rosemary. The tradeoff is peace at home versus walk-out-the-door restaurants.",
    nearbyTowns: [
      { name: "Seagrove Beach", slug: "seagrove-beach", note: "Restaurant corridor nearby" },
      { name: "Seacrest Beach", slug: "seacrest-beach", note: "Quieter stretch to the east" },
    ],
    relatedGuideSlugs: ["ultimate-30a-first-timers-guide", "public-beaches-30a"],
    faqs: [
      {
        question: "Is WaterSound walkable?",
        answer:
          "Not really for daily errands. It's a residential community. Most guests bike or drive to restaurants and beach access.",
      },
      {
        question: "Who should stay in WaterSound?",
        answer:
          "Travelers who want a quieter base and don't mind driving for dinner. Less ideal if you want nightlife outside your door.",
      },
    ],
  },
  "seagrove-beach": {
    vibe: "Central 30A with a restaurant strip and older beach cottages mixed with newer builds.",
    bestFor: ["Food variety", "Central location", "Beach without a gated town square"],
    quickFacts: [
      { label: "Walkability", value: "Along the strip", icon: "directions_walk" },
      { label: "Beach", value: "Short walk or drive", icon: "beach_access" },
      { label: "Crowds", value: "Busy dinner hours", icon: "groups" },
      { label: "Dining", value: "Strong corridor picks", icon: "restaurant" },
    ],
    beachAccess:
      "Beach access points along the main stretch. Some rentals walk; others are a quick drive to your preferred access.",
    parking:
      "Dinner-hour parking along 30A gets tight on weekends. Locals learn their favorite access points and backup restaurants.",
    diningStyle:
      "One of the better food corridors on 30A. Casual lunches, seafood, and date-night spots without staying inside one planned town.",
    nearbyTowns: [
      { name: "WaterSound", slug: "watersound", note: "Quieter residential neighbor" },
      { name: "Grayton Beach", slug: "grayton-beach", note: "Artsy, laid-back west" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "family-friendly-30a-beach-vacation",
    ],
    faqs: [
      {
        question: "Is Seagrove walkable?",
        answer:
          "Along the main restaurant strip, yes for hopping between spots. It's not a single enclosed town square like Seaside or Rosemary.",
      },
      {
        question: "Why stay in Seagrove vs Seaside?",
        answer:
          "Location and food variety without the Seaside premium. You trade the famous town green for a more central, corridor feel.",
      },
    ],
  },
  "grayton-beach": {
    vibe: "Old Florida character, sandy shoes welcome, and a loose rhythm around beach and casual food.",
    bestFor: ["Local personality", "Dog-friendly culture", "Laid-back groups"],
    quickFacts: [
      { label: "Walkability", value: "Moderate", icon: "directions_walk" },
      { label: "Beach", value: "Short walk", icon: "beach_access" },
      { label: "Crowds", value: "Famous spots busy", icon: "groups" },
      { label: "Dining", value: "Casual icons", icon: "restaurant" },
    ],
    beachAccess:
      "Small-town beach neighborhood with access near the state park area. Most visitors walk or bike from their rental.",
    parking:
      "Iconic restaurants and beach lots fill on summer weekends. Weekdays are more forgiving if you time lunch and beach runs.",
    diningStyle:
      "Casual seafood, beach bars, and a few names everyone asks about. Less white-tablecloth than Rosemary, more personality.",
    nearbyTowns: [
      { name: "Blue Mountain Beach", slug: "blue-mountain-beach", note: "Quieter neighbor west" },
      { name: "WaterColor", slug: "watercolor", note: "Resort amenities east" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "family-friendly-30a-beach-vacation",
    ],
    faqs: [
      {
        question: "Is Grayton Beach dog-friendly?",
        answer:
          "More than most polished towns. Dog culture shows up in daily life here. Check beach rules for your specific access point.",
      },
      {
        question: "Is Grayton good for families?",
        answer:
          "Yes, if you want a relaxed week without a curated town square. Kids love the beach; parents love not needing a reservation for every meal.",
      },
    ],
  },
  watercolor: {
    vibe: "Resort pools and bike paths next door to Seaside energy.",
    bestFor: ["Families with kids", "Pool-and-house weeks", "Soft landing near Seaside"],
    quickFacts: [
      { label: "Walkability", value: "Inside community", icon: "directions_walk" },
      { label: "Beach", value: "Walk or bike", icon: "beach_access" },
      { label: "Crowds", value: "Family-heavy peak", icon: "groups" },
      { label: "Dining", value: "Seaside nearby", icon: "restaurant" },
    ],
    beachAccess:
      "Bike paths connect to beach access. Many families bike to the sand; some rentals are closer than others.",
    parking:
      "Inside the neighborhood is easier than Seaside proper. You'll still compete for tables if you cross into Seaside for dinner.",
    diningStyle:
      "Stay local for quiet nights or walk into Seaside for the town green and a wider restaurant mix.",
    nearbyTowns: [
      { name: "Seaside", slug: "seaside", note: "Famous town square next door" },
      { name: "Seagrove Beach", slug: "seagrove-beach", note: "Restaurant corridor" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "family-friendly-30a-beach-vacation",
      "public-beaches-30a",
    ],
    faqs: [
      {
        question: "Can you walk to Seaside from WaterColor?",
        answer:
          "From many rentals, yes. It's close enough that families treat Seaside as an extension of the evening.",
      },
      {
        question: "Is WaterColor good for families?",
        answer:
          "One of the popular family picks. Pools, paths, and amenities inside; Seaside walkable when you want more action.",
      },
    ],
  },
  seaside: {
    vibe: "Pastel cottages, a walkable town green, and the 30A town everyone pictures first.",
    bestFor: ["Families with young kids", "First trip to 30A", "Walk-to-dinner rentals"],
    quickFacts: [
      { label: "Walkability", value: "High", icon: "directions_walk" },
      { label: "Beach", value: "Short walk", icon: "beach_access" },
      { label: "Crowds", value: "Busy peak season", icon: "groups" },
      { label: "Dining", value: "Walkable", icon: "restaurant" },
    ],
    beachAccess:
      "Most rentals put you a short walk from the sand. Public access points branch off the main streets.",
    parking:
      "Summer Saturdays fill up fast. Get to the beach before 10 or walk from the house. Biking beats circling the lots.",
    diningStyle:
      "Pizza and tacos on the green, Gulf-front sunset tables, and nicer spots when you want a real sit-down night.",
    nearbyTowns: [
      { name: "WaterColor", slug: "watercolor", note: "Quieter neighbor, resort pools" },
      { name: "Seagrove Beach", slug: "seagrove-beach", note: "Central corridor dining" },
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
          "For a typical week, mostly yes. Coffee, beach, and dinner are walkable from most rentals. You'll still want a car for Publix or a day west on 30A.",
      },
      {
        question: "Is Seaside good with kids?",
        answer:
          "One of the easier towns for families. The green gives them room to run, beach access is close, and you're not loading everyone into the car for every meal.",
      },
    ],
  },
  "blue-mountain-beach": {
    vibe: "Higher dunes, local staples, and a calmer week without the town-square scene.",
    bestFor: ["Quieter stays", "Repeat visitors", "Less see-and-be-seen energy"],
    quickFacts: [
      { label: "Walkability", value: "Low", icon: "directions_walk" },
      { label: "Beach", value: "Short drive", icon: "beach_access" },
      { label: "Crowds", value: "Quieter", icon: "groups" },
      { label: "Dining", value: "Local + drives east", icon: "restaurant" },
    ],
    beachAccess:
      "Neighborhood feel with a handful of local access points. Most guests drive or bike to their preferred beach lot.",
    parking:
      "Easier than Seaside or Rosemary at the town level. Favorite local spots still fill on perfect summer weekends.",
    diningStyle:
      "A few local staples close by. Plan drives east to Grayton or Seagrove when you want more restaurant choice.",
    nearbyTowns: [
      { name: "Grayton Beach", slug: "grayton-beach", note: "Artsy, more restaurant energy" },
      { name: "Santa Rosa Beach", slug: "santa-rosa-beach", note: "Broader area west" },
    ],
    relatedGuideSlugs: ["ultimate-30a-first-timers-guide", "public-beaches-30a"],
    faqs: [
      {
        question: "Why is it called Blue Mountain?",
        answer:
          "The dunes here are among the highest on the Gulf Coast. Small detail, but it matches the quieter, more local tone.",
      },
      {
        question: "Who fits Blue Mountain best?",
        answer:
          "Travelers who want a softer soundtrack for the week. You'll drive more for nightlife than in Seaside or Rosemary.",
      },
    ],
  },
  "santa-rosa-beach": {
    vibe: "A wide zip code — your week depends on which neighborhood you actually booked.",
    bestFor: ["Specific rental layouts", "Gulf Place access", "Spread-out house groups"],
    quickFacts: [
      { label: "Walkability", value: "Varies widely", icon: "directions_walk" },
      { label: "Beach", value: "Check your pin", icon: "beach_access" },
      { label: "Crowds", value: "Depends on pocket", icon: "groups" },
      { label: "Dining", value: "Gulf Place + drives", icon: "restaurant" },
    ],
    beachAccess:
      "Could be walkable to a cluster or a short drive. Read the listing distance to beach access, not just the town name.",
    parking:
      "Varies by neighborhood. Gulf Place and 98 corridors get busy in peak season; tucked-away rentals are calmer.",
    diningStyle:
      "Gulf Place for a village hub, or drive along 30A for restaurant corridors east and west.",
    nearbyTowns: [
      { name: "Gulf Place", slug: "gulf-place", note: "Walkable village cluster" },
      { name: "Dune Allen Beach", slug: "dune-allen-beach", note: "Quieter west end" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "public-beaches-30a",
      "where-to-buy-groceries-30a",
    ],
    faqs: [
      {
        question: "Is Santa Rosa Beach the same as Gulf Place?",
        answer:
          "No. Santa Rosa is the broader area. Gulf Place is a village-style pocket inside it with shops and restaurants.",
      },
      {
        question: "What should I check before booking?",
        answer:
          "Distance to beach access and to dining. The town name alone doesn't tell you if you're walkable or driving every day.",
      },
    ],
  },
  "gulf-place": {
    vibe: "Colorful village hub with shops, casual dining, and a relaxed meeting point.",
    bestFor: ["Walkable village cluster", "Casual dinners", "Santa Rosa Beach anchor"],
    quickFacts: [
      { label: "Walkability", value: "High in village", icon: "directions_walk" },
      { label: "Beach", value: "Short drive", icon: "beach_access" },
      { label: "Crowds", value: "Weekend busy", icon: "groups" },
      { label: "Dining", value: "On-site options", icon: "restaurant" },
    ],
    beachAccess:
      "The village is a dining and shopping cluster. Beach time is usually a short drive to your preferred access point.",
    parking:
      "Village lots fill around meal times and summer weekends. Weekday mornings are calmer for errands.",
    diningStyle:
      "Casual dining, live music in season, coffee to go. Not Seaside — more useful and relaxed.",
    nearbyTowns: [
      { name: "Santa Rosa Beach", slug: "santa-rosa-beach", note: "Broader surrounding area" },
      { name: "Prominence", slug: "prominence", note: "The Hub events nearby" },
    ],
    relatedGuideSlugs: ["ultimate-30a-first-timers-guide", "where-to-buy-groceries-30a"],
    faqs: [
      {
        question: "Can you stay walkable in Gulf Place?",
        answer:
          "Yes, if your rental is in or next to the village cluster. Many Santa Rosa addresses still require a drive here.",
      },
      {
        question: "Is Gulf Place good for families?",
        answer:
          "Fine for casual meals and browsing. Most families still drive to beach access and plan around 98 traffic in peak weeks.",
      },
    ],
  },
  prominence: {
    vibe: "Planned community with The Hub as the go-to for food, drinks, and events.",
    bestFor: ["On-site dining and events", "Family pool weeks", "Less driving for dinner"],
    quickFacts: [
      { label: "Walkability", value: "Inside community", icon: "directions_walk" },
      { label: "Beach", value: "Short drive", icon: "beach_access" },
      { label: "Crowds", value: "Hub busy weekends", icon: "groups" },
      { label: "Dining", value: "The Hub", icon: "restaurant" },
    ],
    beachAccess:
      "Residential community west on the corridor. Beach is part of the plan but usually a short drive from the house.",
    parking:
      "The Hub fills on perfect weather weekends. Check the event calendar for the week you're visiting.",
    diningStyle:
      "The Hub is the center of gravity — food, drinks, outdoor events. Less need to fight 30A traffic every night.",
    nearbyTowns: [
      { name: "Santa Rosa Beach", slug: "santa-rosa-beach", note: "Broader west corridor" },
      { name: "Gulf Place", slug: "gulf-place", note: "Village dining alternative" },
    ],
    relatedGuideSlugs: [
      "ultimate-30a-first-timers-guide",
      "family-friendly-30a-beach-vacation",
    ],
    faqs: [
      {
        question: "What is The Hub?",
        answer:
          "Prominence's dining and entertainment cluster. Many guests plan evenings around what's running that week.",
      },
      {
        question: "Do you need a car in Prominence?",
        answer:
          "For The Hub, often not. For beach days and exploring Grayton or Seaside, yes.",
      },
    ],
  },
  "dune-allen-beach": {
    vibe: "Western end of 30A — more space, quieter streets, still close to Grayton and Seaside.",
    bestFor: ["Bigger house groups", "Quieter base", "Less frantic parking"],
    quickFacts: [
      { label: "Walkability", value: "Low", icon: "directions_walk" },
      { label: "Beach", value: "Short drive", icon: "beach_access" },
      { label: "Crowds", value: "Quieter", icon: "groups" },
      { label: "Dining", value: "Drive east", icon: "restaurant" },
    ],
    beachAccess:
      "Residential neighborhoods with spread-out access. Less crowded than iconic town centers farther east.",
    parking:
      "Generally easier than mid-corridor towns. You'll still hit 30A traffic driving east for dinner on summer weekends.",
    diningStyle:
      "Stay west for quiet nights or drive toward Grayton, Gulf Place, and Seagrove for restaurant variety.",
    nearbyTowns: [
      { name: "Santa Rosa Beach", slug: "santa-rosa-beach", note: "Broader west area" },
      { name: "Grayton Beach", slug: "grayton-beach", note: "Artsy dining east" },
    ],
    relatedGuideSlugs: ["ultimate-30a-first-timers-guide", "public-beaches-30a"],
    faqs: [
      {
        question: "Is Dune Allen on Scenic 30A?",
        answer:
          "Yes, far west end. More spread out and residential than Seaside or Rosemary.",
      },
      {
        question: "Who should book Dune Allen?",
        answer:
          "Groups who want space and a quieter base. Less ideal if you want a walkable town center outside your door.",
      },
    ],
  },
  destin: {
    vibe: "Full harbor city with charter boats, wide beaches, and a bigger scale than 30A towns.",
    bestFor: ["Boating and fishing", "Big-city amenities", "Wide beach options"],
    quickFacts: [
      { label: "Walkability", value: "Varies by area", icon: "directions_walk" },
      { label: "Beach", value: "Wide public beaches", icon: "beach_access" },
      { label: "Crowds", value: "Busy summer", icon: "groups" },
      { label: "Dining", value: "Harbor + strip", icon: "restaurant" },
    ],
    beachAccess:
      "Long stretches of public beach. Access depends on where you stay — harbor area vs beachfront vs inland.",
    parking:
      "Peak summer fills beach lots and harbor parking. Weekday mornings are calmer for boat launches and errands.",
    diningStyle:
      "Harbor seafood, casual strip spots, and a wider range than small 30A towns. Day-trip to 30A for new-urbanism walks.",
    nearbyTowns: [
      { name: "Miramar Beach", slug: "miramar-beach", note: "Resort strip east" },
      { name: "Sandestin", slug: "sandestin", note: "Baytowne village" },
    ],
    relatedGuideSlugs: [
      "how-far-is-30a-from-destin",
      "ultimate-30a-first-timers-guide",
      "how-to-get-to-30a-florida",
    ],
    faqs: [
      {
        question: "How far is Destin from 30A?",
        answer:
          "Roughly 20–40 minutes depending on traffic and which 30A town you're heading to. Many visitors day-trip between the two.",
      },
      {
        question: "Destin or 30A for a first trip?",
        answer:
          "Destin if you want harbor life and big-city services. 30A if you want walkable beach towns and a slower corridor pace.",
      },
    ],
  },
  "miramar-beach": {
    vibe: "Resort beaches and shopping corridors bridging Destin energy and quieter 30A.",
    bestFor: ["Wide beachfront", "Outlet shopping", "Resort-style weeks"],
    quickFacts: [
      { label: "Walkability", value: "Low", icon: "directions_walk" },
      { label: "Beach", value: "Beachfront resorts", icon: "beach_access" },
      { label: "Crowds", value: "Peak season busy", icon: "groups" },
      { label: "Dining", value: "Strip + drives", icon: "restaurant" },
    ],
    beachAccess:
      "Long beach fronts with resort and rental density. Morning beach runs beat afternoon parking hunts.",
    parking:
      "Crowded lots in peak season. Time shopping runs for weekday lunches when you can.",
    diningStyle:
      "Casual beach dining nearby, Destin harbor east, 30A towns farther east when you want a different scene.",
    nearbyTowns: [
      { name: "Destin", slug: "destin", note: "Harbor and charter boats" },
      { name: "Sandestin", slug: "sandestin", note: "Baytowne nightlife" },
    ],
    relatedGuideSlugs: [
      "how-far-is-30a-from-destin",
      "ultimate-30a-first-timers-guide",
    ],
    faqs: [
      {
        question: "Is Miramar Beach the same as Destin?",
        answer:
          "No. Miramar sits between Destin and 30A with its own resort strips. People mix the names; the map pin matters.",
      },
      {
        question: "Can you day-trip to 30A from Miramar?",
        answer:
          "Yes. It's a common combo — resort beach here, walkable towns on 30A for an afternoon.",
      },
    ],
  },
  sandestin: {
    vibe: "Resort-scale community with golf, Baytowne Wharf, and a week that can stay entirely on property.",
    bestFor: ["Golf trips", "Baytowne nightlife", "Less decision fatigue"],
    quickFacts: [
      { label: "Walkability", value: "Inside resort", icon: "directions_walk" },
      { label: "Beach", value: "On-site access", icon: "beach_access" },
      { label: "Crowds", value: "Holiday spikes", icon: "groups" },
      { label: "Dining", value: "Baytowne walkable", icon: "restaurant" },
    ],
    beachAccess:
      "Beach access is part of the resort plan. Some areas are inland — check how far your unit is from the sand.",
    parking:
      "Inside the resort is manageable. Baytowne gets busy on holiday weekends and event nights.",
    diningStyle:
      "Baytowne Wharf for walkable dinners and bars. Golf-cart culture shapes how groups move at night.",
    nearbyTowns: [
      { name: "Miramar Beach", slug: "miramar-beach", note: "Beach strip next door" },
      { name: "Destin", slug: "destin", note: "Harbor dining" },
    ],
    relatedGuideSlugs: [
      "how-far-is-30a-from-destin",
      "ultimate-30a-first-timers-guide",
    ],
    faqs: [
      {
        question: "Do you need to leave Sandestin?",
        answer:
          "You can do a full week inside — beach, golf, Baytowne. Most groups still drive to Destin or 30A at least once.",
      },
      {
        question: "What is Baytowne Wharf?",
        answer:
          "Sandestin's walkable village for restaurants, bars, and events. The nightlife hub for the resort.",
      },
    ],
  },
  "panama-city-beach": {
    vibe: "Full beach city with a long strip, family attractions, and a faster pulse than 30A.",
    bestFor: ["Big lodging inventory", "Attractions and nightlife", "Long beach runs"],
    quickFacts: [
      { label: "Walkability", value: "Varies by zone", icon: "directions_walk" },
      { label: "Beach", value: "Long public coast", icon: "beach_access" },
      { label: "Crowds", value: "Summer packed", icon: "groups" },
      { label: "Dining", value: "Strip variety", icon: "restaurant" },
    ],
    beachAccess:
      "Miles of beach. Front-beach towers vs back-road neighborhoods feel like different trips — check your zone.",
    parking:
      "Summer packs the strip. Locals learn detours and timing around school breaks and events.",
    diningStyle:
      "Beach bars, seafood shacks, and chain variety along the strip. Treat 30A as a quieter day trip.",
    nearbyTowns: [],
    relatedGuideSlugs: [
      "how-to-get-to-30a-florida",
      "ultimate-30a-first-timers-guide",
    ],
    faqs: [
      {
        question: "PCB or 30A for vacation?",
        answer:
          "PCB for scale, nightlife, and attractions. 30A for walkable towns and a slower corridor. Many visitors do both.",
      },
      {
        question: "How far is PCB from 30A?",
        answer:
          "About 45–60 minutes depending on traffic. Plan a full day if you're heading to Rosemary or Seaside.",
      },
    ],
  },
};

export function getTownPlanningProfile(slug: string): TownPlanningProfile | null {
  return TOWN_PLANNING[slug] ?? null;
}
