"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessResultCard as CardModel } from "@/lib/ask/types";

type Props = {
  card: CardModel;
  onSelect?: (card: CardModel) => void;
  onReport?: (card: CardModel) => void;
};

export function BusinessResultCard({ card, onSelect, onReport }: Props) {
  return (
    <Card
      size="sm"
      className="card-interactive gap-0 py-0 ring-border transition-premium"
    >
      <button
        type="button"
        className="relative block aspect-[16/10] w-full overflow-hidden rounded-t-xl text-left"
        onClick={() => onSelect?.(card)}
      >
        {card.image_url ? (
          <RemoteCoverImage
            src={card.image_url}
            alt=""
            placeholderIcon="storefront"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent text-accent-foreground">
            <Store className="size-10 opacity-60" aria-hidden />
          </div>
        )}
      </button>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-listing-title leading-snug">{card.title}</CardTitle>
          {card.price_level != null ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {"$".repeat(card.price_level)}
            </span>
          ) : null}
        </div>
        {(card.town_or_area || card.category) && (
          <p className="text-listing-meta">
            {[card.town_or_area, card.category].filter(Boolean).join(" · ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {card.excerpt ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{card.excerpt}</p>
        ) : card.why_this_matched ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{card.why_this_matched}</p>
        ) : null}
        {card.match_reason ? (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs leading-relaxed text-sky-950">
            <span className="font-semibold text-sky-800">Why this pick: </span>
            {card.match_reason}
          </p>
        ) : null}
        {card.tags.length > 0 ? (
          <p className="mt-2 line-clamp-1 text-xs text-primary">{card.tags.slice(0, 4).join(" · ")}</p>
        ) : null}
      </CardContent>
      <CardFooter className="gap-2 border-t-0 bg-transparent pt-0">
        <Link
          href={`/business/${card.slug}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View listing
        </Link>
        {onReport ? (
          <Button variant="ghost" size="sm" type="button" onClick={() => onReport(card)}>
            Info looks wrong
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
