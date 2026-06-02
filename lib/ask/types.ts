export type AskChannel = "web" | "sms" | "mobile";

export type SourceReference = {
  type: "business" | "guide" | "town" | "area";
  id: string;
  slug?: string;
  title: string;
};

export type AskAction = {
  type: "view_listing" | "save" | "report" | "share" | "open_form";
  label: string;
  href?: string;
  businessId?: string;
};

export type BusinessResultCard = {
  id: string;
  title: string;
  slug: string;
  town_or_area: string | null;
  category: string | null;
  excerpt: string | null;
  price_level: number | null;
  tags: string[];
  /** Listing description (AI summary). */
  why_this_matched: string;
  /** Inspector / merge ranking explanation (shown as match callout). */
  match_reason?: string;
  confidence_score: number;
  source_status: "verified";
  image_url?: string | null;
};

export type GuideResultCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  hero_image_url: string | null;
  why_this_matched?: string;
};

export type TownResultCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  hero_image_url: string | null;
  region: string | null;
  why_this_matched?: string;
};

export type AreaResultCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  hero_image_url: string | null;
  area_type: string | null;
  why_this_matched?: string;
};

export type ActiveFilters = {
  query?: string;
  town_or_area?: string;
  town_id?: string;
  category?: string;
  tags?: string[];
  dietary_tags?: string[];
  atmosphere_tags?: string[];
  occasion_tags?: string[];
  price_level?: number;
};

export type RefinementHistoryEntry = {
  at: string;
  userMessage: string;
  intent: RefinementIntent;
  filtersAfter: ActiveFilters;
};

export type RefinementIntent =
  | "refine"
  | "pivot"
  | "compare"
  | "new_search"
  | "form"
  | "general_q";

export type SearchContext = {
  lastQuery: string;
  lastTool:
    | "searchBusinesses"
    | "searchGuides"
    | "searchTowns"
    | "searchAreas"
    | null;
  resultCount: number;
};

export type ArtifactSessionState = {
  id: string;
  conversationId: string;
  artifactType: AskArtifact["type"];
  searchContext: SearchContext;
  activeFilters: ActiveFilters;
  refinementHistory: RefinementHistoryEntry[];
};

export type BusinessResultsArtifact = {
  type: "business_results";
  title: string;
  results: BusinessResultCard[];
  activeFilters: ActiveFilters;
  relatedSearches?: string[];
};

export type GuideResultsArtifact = {
  type: "guide_results";
  title: string;
  results: GuideResultCard[];
  activeFilters: ActiveFilters;
};

export type TownResultsArtifact = {
  type: "town_results";
  title: string;
  results: TownResultCard[];
  activeFilters: ActiveFilters;
};

export type AreaResultsArtifact = {
  type: "area_results";
  title: string;
  results: AreaResultCard[];
  activeFilters: ActiveFilters;
};

export type BusinessSubmissionFormArtifact = {
  type: "business_submission_form";
  prefill?: Record<string, string>;
};

export type FeedbackFormArtifact = {
  type: "feedback_form";
  businessId?: string;
  listingContext?: string;
};

export type HumanHandoffStatusArtifact = {
  type: "human_handoff_status";
  taskId: string;
  status: string;
  message: string;
};

export type EmptyStateArtifact = {
  type: "empty_state";
  title: string;
  message: string;
  suggestions?: string[];
};

export type ClarificationQuestion = {
  id: string;
  question: string;
  /** Shown as tap-to-select chips. If absent, renders a text input. */
  suggestions?: string[];
  /** Show chips AND a free-text input below (e.g. for location). */
  allowFreeText?: boolean;
};

export type ClarificationFormArtifact = {
  type: "clarification_form";
  questions: ClarificationQuestion[];
  /** Original user message before clarifying questions were shown. */
  originalQuery: string;
};

export type AskArtifact =
  | BusinessResultsArtifact
  | GuideResultsArtifact
  | TownResultsArtifact
  | AreaResultsArtifact
  | BusinessSubmissionFormArtifact
  | FeedbackFormArtifact
  | HumanHandoffStatusArtifact
  | EmptyStateArtifact
  | ClarificationFormArtifact;

export type AskEngineResult = {
  conversationId: string;
  artifactSessionId?: string;
  message: string;
  artifact?: AskArtifact;
  shareableArtifactSummary?: string;
  followUps?: string[];
  confidenceScore: number;
  handoffRequired: boolean;
  sources: SourceReference[];
  actions?: AskAction[];
};

export type AskTurnInput = {
  channel: AskChannel;
  message: string;
  conversationId?: string;
  artifactSessionId?: string;
  sessionKey: string;
  userId?: string | null;
  ipKey?: string;
  userAgent?: string | null;
};

export type AskStreamMeta = {
  conversationId: string;
  artifactSessionId?: string;
  artifact?: AskArtifact;
  followUps?: string[];
  confidenceScore: number;
  handoffRequired: boolean;
};
