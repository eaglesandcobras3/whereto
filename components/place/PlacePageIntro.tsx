"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const CLAMP_THRESHOLD = 100;

type Props = {
  text: string;
  className?: string;
};

export function PlacePageIntro({ text, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const canClamp = text.length > CLAMP_THRESHOLD;

  return (
    <div className={className}>
      <p
        className={cn(
          "text-left text-sm leading-relaxed text-zinc-500 sm:text-[0.9375rem] md:text-base",
          canClamp && !expanded && "line-clamp-2 md:line-clamp-none",
        )}
      >
        {text}
      </p>
      {canClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-xs font-medium text-[var(--color-primary)] md:hidden"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
