/** Shared scannable profile shape for town and area pages. */
export type PlaceQuickFact = {
  label: string;
  value: string;
  icon: string;
};

export type PlacePlanningProfile = {
  vibe: string;
  bestFor: string[];
  quickFacts: PlaceQuickFact[];
  beachAccess: string;
  parking: string;
  diningStyle?: string;
  nearbyTowns?: Array<{ name: string; slug: string; note?: string }>;
  nearbyLinks?: Array<{ name: string; href: string; note?: string }>;
  relatedGuideSlugs?: string[];
  faqs?: Array<{ question: string; answer: string }>;
};
