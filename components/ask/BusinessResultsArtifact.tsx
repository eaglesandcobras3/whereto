"use client";

import { X } from "lucide-react";
import type { BusinessResultsArtifact as Artifact } from "@/lib/ask/types";
import type { ActiveFilters } from "@/lib/ask/types";
import { BusinessResultCard } from "@/components/ask/BusinessResultCard";
import { Button } from "@/components/ui/button";
import { PromptChip } from "@/components/ui/prompt-chip";

type Props = {
  artifact: Artifact;
  onSelectBusiness: (id: string) => void;
  onReportBusiness: (id: string) => void;
  onRemoveFilter: (key: keyof ActiveFilters) => void;
  onClearFilters: () => void;
  onRefine: (message: string) => void;
};

function filterPills(filters: ActiveFilters): { key: keyof ActiveFilters; label: string }[] {
  const pills: { key: keyof ActiveFilters; label: string }[] = [];
  if (filters.town_or_area) pills.push({ key: "town_or_area", label: filters.town_or_area });
  if (filters.category) pills.push({ key: "category", label: filters.category.replace(/_/g, " ") });
  if (filters.price_level) pills.push({ key: "price_level", label: `$${filters.price_level}` });
  for (const t of filters.tags ?? []) pills.push({ key: "tags", label: t });
  for (const d of filters.dietary_tags ?? []) pills.push({ key: "dietary_tags", label: d });
  return pills;
}

export function BusinessResultsArtifactView({
  artifact,
  onSelectBusiness,
  onReportBusiness,
  onRemoveFilter,
  onClearFilters,
  onRefine,
}: Props) {
  const pills = filterPills(artifact.activeFilters);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-section text-foreground">{artifact.title}</h2>
        <p className="text-sm text-muted-foreground">
          {artifact.results.length} verified {artifact.results.length === 1 ? "place" : "places"}
        </p>
      </div>

      {pills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((p, i) => (
            <Button
              key={`${p.key}-${p.label}-${i}`}
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1 rounded-full px-2.5"
              onClick={() => onRemoveFilter(p.key)}
            >
              {p.label}
              <X className="size-3" aria-hidden />
            </Button>
          ))}
          <Button variant="ghost" size="sm" type="button" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      ) : null}

      {artifact.relatedSearches?.length ? (
        <div className="flex flex-wrap gap-2">
          {artifact.relatedSearches.slice(0, 4).map((s) => (
            <PromptChip key={s} onClick={() => onRefine(s)}>
              {s}
            </PromptChip>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {artifact.results.map((card) => (
          <BusinessResultCard
            key={card.id}
            card={card}
            onSelect={() => onSelectBusiness(card.id)}
            onReport={() => onReportBusiness(card.id)}
          />
        ))}
      </div>
    </div>
  );
}
