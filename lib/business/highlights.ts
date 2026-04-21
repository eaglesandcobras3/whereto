export type BusinessHighlightTag = {
  slug?: string | null;
  name?: string | null;
};

type HighlightSelectorInput = {
  aiHighlights?: string[] | null;
  tags?: BusinessHighlightTag[];
  categoryName?: string | null;
  categorySlug?: string | null;
  max?: number;
};

const HIGHLIGHT_TAGS_BY_CATEGORY: Record<string, string[]> = {
  restaurants: [
    "date_night",
    "family",
    "kid_friendly",
    "waterfront",
    "sunset_views",
    "outdoor_seating",
    "live_music",
    "worth_the_wait",
    "quick_bite",
    "brunch",
    "breakfast",
    "dinner",
  ],
  coffee_shops: [
    "coffee",
    "brunch",
    "quick_bite",
    "date_night",
    "pet_friendly",
    "outdoor_seating",
    "casual",
  ],
  bars: [
    "live_music",
    "waterfront",
    "sunset_views",
    "date_night",
    "groups",
    "upscale",
    "casual",
  ],
  activities: [
    "family",
    "kid_friendly",
    "pet_friendly",
    "waterfront",
    "outdoor_seating",
    "groups",
  ],
  shopping: [
    "family",
    "pet_friendly",
    "upscale",
    "casual",
    "date_night",
  ],
  services: [
    "family",
    "pet_friendly",
    "upscale",
    "casual",
    "outdoor_seating",
  ],
  default: [
    "family",
    "date_night",
    "pet_friendly",
    "waterfront",
    "sunset_views",
    "outdoor_seating",
    "casual",
  ],
};

function normalizeTagSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function formatTagLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function normalizeCategoryKey(categoryName?: string | null, categorySlug?: string | null): string {
  const normalizedSlug = (categorySlug ?? "").trim().toLowerCase();
  if (normalizedSlug) return normalizedSlug.replace(/[-\s]+/g, "_");
  return (categoryName ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}

export function selectBusinessHighlights({
  aiHighlights,
  tags = [],
  categoryName,
  categorySlug,
  max = 6,
}: HighlightSelectorInput): string[] {
  const cleanedAi = (aiHighlights ?? []).map((h) => h.trim()).filter(Boolean);
  if (cleanedAi.length > 0) return cleanedAi.slice(0, max);

  const categoryKey = normalizeCategoryKey(categoryName, categorySlug);
  const preferred = HIGHLIGHT_TAGS_BY_CATEGORY[categoryKey] ?? HIGHLIGHT_TAGS_BY_CATEGORY.default;

  const availableBySlug = new Map<string, string>();
  for (const tag of tags) {
    const rawSlug = (tag.slug ?? "").trim();
    const rawName = (tag.name ?? "").trim();
    const normalized = normalizeTagSlug(rawSlug || rawName);
    if (!normalized) continue;
    if (!availableBySlug.has(normalized)) {
      availableBySlug.set(normalized, rawName || formatTagLabel(normalized));
    }
  }

  const selected: string[] = [];
  for (const slug of preferred) {
    const normalized = normalizeTagSlug(slug);
    const label = availableBySlug.get(normalized);
    if (!label) continue;
    selected.push(label);
    if (selected.length >= max) break;
  }

  return selected;
}
