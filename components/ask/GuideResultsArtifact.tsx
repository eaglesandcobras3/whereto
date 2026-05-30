"use client";

import Link from "next/link";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import { Card, CardContent } from "@/components/ui/card";
import type { GuideResultsArtifact } from "@/lib/ask/types";

type Props = {
  artifact: GuideResultsArtifact;
};

export function GuideResultsArtifactView({ artifact }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-section text-foreground">{artifact.title}</h2>
      <ul className="space-y-3">
        {artifact.results.map((g) => (
          <li key={g.id}>
            <Card
              size="sm"
              className="card-interactive gap-0 py-0 ring-border transition-premium hover:ring-primary/30"
            >
              <Link href={`/guide/${g.slug}`} className="flex gap-3 p-3">
                {g.hero_image_url ? (
                  <RemoteCoverImage
                    src={g.hero_image_url}
                    alt=""
                    placeholderIcon="menu_book"
                    fill={false}
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <CardContent className="min-w-0 px-0 py-0">
                  <p className="font-medium text-foreground">{g.title}</p>
                  {g.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.excerpt}</p>
                  ) : null}
                </CardContent>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
