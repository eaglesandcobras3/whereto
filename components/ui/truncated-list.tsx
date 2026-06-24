"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** CSS max-height when collapsed (e.g. "12rem", "16rem"). */
  maxHeight?: string;
  /** Total item count shown in the toggle label. */
  itemCount: number;
  /** Noun for the toggle label (e.g. "listings", "links"). */
  label?: string;
  /** Background color for the gradient fade. Must match the parent surface. */
  fadeFrom?: string;
  className?: string;
};

export function TruncatedList({
  children,
  maxHeight = "12rem",
  itemCount,
  label = "items",
  fadeFrom = "var(--color-site-chrome)",
  className,
}: Props) {
  const regionId = useId();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={className}>
      <div
        id={regionId}
        role="region"
        aria-label={`${itemCount} ${label}`}
        className="relative overflow-hidden transition-[max-height] duration-300"
        style={expanded ? undefined : { maxHeight }}
      >
        {children}
        {!expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            aria-hidden="true"
            style={{
              background: `linear-gradient(to top, ${fadeFrom}, transparent)`,
            }}
          />
        )}
      </div>
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          aria-controls={regionId}
          className="mt-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)]"
        >
          View all {itemCount} {label}
        </button>
      )}
    </div>
  );
}
