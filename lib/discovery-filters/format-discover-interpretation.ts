import { hasCuisineProductTags } from "@/lib/discovery-filters/cuisine-product-tags";

export type DiscoverInterpretationInput = {
  nlQuery?: string;
  type: "storefront" | "service";
  tags: string[];
  categoryLabel?: string;
  serviceCategoryLabel?: string;
  anchorTownNames: string[];
  effectiveTownNames: string[];
  townScope?: "near" | "exact";
  labelForSlug: (slug: string) => string;
};

function formatTagList(tags: string[], labelForSlug: (slug: string) => string): string {
  const labels = tags.map(labelForSlug);
  if (labels.length <= 2) return labels.join(" and ");
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function formatTownScope(input: DiscoverInterpretationInput): string | null {
  const { anchorTownNames, effectiveTownNames, townScope } = input;
  if (!effectiveTownNames.length) return null;

  if (townScope === "near" && anchorTownNames.length) {
    const anchor = anchorTownNames.join(" and ");
    const others = effectiveTownNames.filter((name) => !anchorTownNames.includes(name));
    if (!others.length) return `in ${anchor}`;
    return `near ${anchor}, including ${others.join(", ")}`;
  }

  if (effectiveTownNames.length <= 3) {
    return `in ${effectiveTownNames.join(", ")}`;
  }

  return `in ${effectiveTownNames.length} towns`;
}

export function formatDiscoverInterpretation(input: DiscoverInterpretationInput): string {
  const parts: string[] = [];

  if (input.tags.length) {
    const tagPhrase = formatTagList(input.tags, input.labelForSlug);
    if (hasCuisineProductTags(input.tags) && !input.categoryLabel) {
      parts.push(`places tagged ${tagPhrase} (restaurants, markets, and similar)`);
    } else {
      parts.push(`places tagged ${tagPhrase}`);
    }
  } else if (input.categoryLabel) {
    parts.push(input.categoryLabel.toLowerCase());
  } else if (input.serviceCategoryLabel) {
    parts.push(input.serviceCategoryLabel.toLowerCase());
  } else {
    parts.push(input.type === "service" ? "regional services" : "storefront businesses");
  }

  const townPhrase = formatTownScope(input);
  if (townPhrase) parts.push(townPhrase);

  if (input.townScope === "near" && input.anchorTownNames.length) {
    parts.push(`${input.anchorTownNames.join(" and ")} ranked first`);
  }

  return parts.join(" · ");
}
