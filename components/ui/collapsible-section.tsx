"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "plain" | "card";
  icon?: string;
  preview?: string;
  sectionNumber?: number;
  /** Plain stacks: drop trailing border and bottom spacing on the last item. */
  trimTrailingSpace?: boolean;
};

export function CollapsibleSection({
  title,
  meta,
  actions,
  children,
  className,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  variant = "card",
  icon,
  preview,
  sectionNumber,
  trimTrailingSpace = false,
}: Props) {
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }

  const isCard = variant === "card";
  const showPreview = isCard && !open && preview?.trim();

  return (
    <section
      className={cn(
        isCard
          ? "overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-all duration-200"
          : cn(
              "border-b border-[var(--color-border)]",
              trimTrailingSpace && "border-b-0",
            ),
        open && isCard && "border-[var(--color-primary)]/25 shadow-premium-md",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start gap-2",
          isCard
            ? "p-4 sm:p-5"
            : cn("pt-3 sm:pt-4", !trimTrailingSpace && "pb-3 sm:pb-4"),
        )}
      >
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          {isCard && sectionNumber != null ? (
            <span
              className="pt-1 font-headline text-sm font-extrabold tabular-nums text-[var(--color-primary)]/45"
              aria-hidden
            >
              {String(sectionNumber).padStart(2, "0")}
            </span>
          ) : null}

          {isCard && icon ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
              <span className="material-symbols-outlined text-xl" aria-hidden>
                {icon}
              </span>
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            {title}
            {meta ? <div className="mt-1">{meta}</div> : null}
            {showPreview ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {preview}
              </p>
            ) : null}
            {isCard ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                {open ? "Hide section" : "Read section"}
              </p>
            ) : null}
          </div>

          <span
            className={cn(
              "material-symbols-outlined mt-0.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          >
            expand_more
          </span>
        </button>
        {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
      </div>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!open}
        className={cn(
          !open && "sr-only",
          open &&
            (isCard
              ? "border-t border-[var(--color-border)] px-4 pb-5 pt-4 sm:px-5 sm:pb-6"
              : trimTrailingSpace
                ? "[&_.prose-p:last-child]:mb-0 [&_.prose-ul:last-child]:mb-0"
                : "pb-4 sm:pb-6"),
        )}
      >
        {children}
      </div>
    </section>
  );
}
