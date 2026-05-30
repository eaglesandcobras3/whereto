"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { BusinessResultCard } from "@/lib/ask/types";

type Props = {
  card: BusinessResultCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReport?: (card: BusinessResultCard) => void;
};

export function SelectedBusinessDrawer({ card, open, onOpenChange, onReport }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {card ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-listing-title">{card.title}</SheetTitle>
              <SheetDescription>
                {[card.town_or_area, card.category].filter(Boolean).join(" · ")}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {card.excerpt ?? card.why_this_matched}
              </p>
              <p className="text-xs text-muted-foreground">
                Verified WhereTo30A listing · match score{" "}
                {Math.round(card.confidence_score * 100)}%
              </p>
              <Separator />
              <div className="flex flex-col gap-2">
                <Link
                  href={`/business/${card.slug}`}
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  View full listing
                </Link>
                {onReport ? (
                  <Button variant="outline" type="button" onClick={() => onReport(card)}>
                    Report incorrect info
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
