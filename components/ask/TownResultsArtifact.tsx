"use client";

import type { TownResultsArtifact } from "@/lib/ask/types";
import { EditorialResultsArtifactView } from "@/components/ask/EditorialResultsArtifact";

type Props = {
  artifact: TownResultsArtifact;
};

export function TownResultsArtifactView({ artifact }: Props) {
  return (
    <EditorialResultsArtifactView
      title={artifact.title}
      hrefForSlug={(slug) => `/${slug}`}
      results={artifact.results.map((t) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        excerpt: t.excerpt,
        hero_image_url: t.hero_image_url,
        meta: t.region,
      }))}
    />
  );
}
