"use client";

import Link from "next/link";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import { Card, CardContent } from "@/components/ui/card";

type EditorialCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  hero_image_url: string | null;
  meta?: string | null;
};

type Props = {
  title: string;
  results: EditorialCard[];
  hrefForSlug: (slug: string) => string;
};

export function EditorialResultsArtifactView({ title, results, hrefForSlug }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-section text-foreground">{title}</h2>
      <ul className="space-y-3">
        {results.map((item) => (
          <li key={item.id}>
            <Card
              size="sm"
              className="card-interactive gap-0 py-0 ring-border transition-premium hover:ring-primary/30"
            >
              <Link href={hrefForSlug(item.slug)} className="flex gap-3 p-3">
                {item.hero_image_url ? (
                  <RemoteCoverImage
                    src={item.hero_image_url}
                    alt=""
                    placeholderIcon="menu_book"
                    fill={false}
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <CardContent className="min-w-0 px-0 py-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  {item.meta ? (
                    <p className="text-xs text-muted-foreground">{item.meta}</p>
                  ) : null}
                  {item.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.excerpt}
                    </p>
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
