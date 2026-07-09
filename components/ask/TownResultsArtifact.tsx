"use client";

import type { TownResultsArtifact } from "@/lib/ask/types";
import { EditorialResultsArtifactView } from "@/components/ask/EditorialResultsArtifact";
import { townPagePath } from "@/lib/routes/town-page-path";

type Props = {
  artifact: TownResultsArtifact;
};

export function TownResultsArtifactView({ artifact }: Props) {
  return (
    <EditorialResultsArtifactView
      title={artifact.title}
      hrefForSlug={(slug) => townPagePath(slug)}
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
