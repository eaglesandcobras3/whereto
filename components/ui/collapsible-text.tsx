"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
};

/**
 * Paragraph hidden on mobile behind a "More" toggle.
 * Always in the DOM (sr-only when collapsed) for SEO and a11y.
 * Visible by default on md+ screens.
 */
export function CollapsibleText({ text, className }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <p
        className={cn(
          className,
          expanded ? "" : "sr-only md:not-sr-only",
        )}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)] md:hidden"
      >
        {expanded ? "Less" : "More"}
      </button>
    </>
  );
}
