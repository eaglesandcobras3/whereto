type Props = {
  tags: string[];
  max?: number;
  /** Show category-colored variants based on tag type */
  colored?: boolean;
  /** Root wrapper; default includes top margin for standalone use */
  className?: string;
};

const tagCategoryMap: Record<string, string> = {
  // Meal tags
  breakfast: "meal",
  lunch: "meal",
  dinner: "meal",
  brunch: "meal",
  // Cuisine tags
  seafood: "cuisine",
  mexican: "cuisine",
  italian: "cuisine",
  coffee: "cuisine",
  // Vibe tags
  romantic: "vibe",
  casual: "vibe",
  upscale: "vibe",
  waterfront: "vibe",
  quick_bite: "vibe",
  beach_casual: "vibe",
  sunset_views: "vibe",
  // Audience tags
  kid_friendly: "audience",
  pet_friendly: "audience",
  date_night: "audience",
  groups: "audience",
  family: "audience",
  // Amenity tags
  outdoor_seating: "amenity",
  live_music: "amenity",
  // Dietary tags
  gluten_free: "dietary",
  vegan: "dietary",
  vegetarian: "dietary",
};

const categoryColors: Record<string, string> = {
  meal: "bg-amber-100/80 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  cuisine: "bg-rose-100/80 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  vibe: "bg-violet-100/80 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  audience: "bg-sky-100/80 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  amenity: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  dietary: "bg-lime-100/80 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  default: "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]",
};

function getTagColor(tag: string, colored: boolean): string {
  if (!colored) return categoryColors.default;
  const category = tagCategoryMap[tag] ?? "default";
  return categoryColors[category] ?? categoryColors.default;
}

export function TagPills({ tags, max = 8, colored = false, className }: Props) {
  const uniqueTags = [...new Set(tags)];
  const slice = uniqueTags.slice(0, max);

  if (!slice.length) return null;

  return (
    <div className={`mt-2 flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {slice.map((t) => (
        <span
          key={t}
          className={`
            inline-flex items-center rounded-full px-2.5 py-0.5
            text-xs font-medium
            transition-colors duration-150
            ${getTagColor(t, colored)}
          `}
        >
          {t.replace(/_/g, " ")}
        </span>
      ))}
      {uniqueTags.length > max ? (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-tertiary)]">
          +{uniqueTags.length - max}
        </span>
      ) : null}
    </div>
  );
}
