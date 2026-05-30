"use client";

import type { AreaResultsArtifact } from "@/lib/ask/types";
import { EditorialResultsArtifactView } from "@/components/ask/EditorialResultsArtifact";

type Props = {
  artifact: AreaResultsArtifact;
};

export function AreaResultsArtifactView({ artifact }: Props) {
  return (
    <EditorialResultsArtifactView
      title={artifact.title}
      hrefForSlug={(slug) => `/area/${slug}`}
      results={artifact.results.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        hero_image_url: a.hero_image_url,
        meta: a.area_type,
      }))}
    />
  );
}
