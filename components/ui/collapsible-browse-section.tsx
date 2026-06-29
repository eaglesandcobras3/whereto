"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TRIGGER_CLASS =
  "flex w-full items-center gap-3 rounded-lg text-left text-[var(--color-text-primary)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2";

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Shown below the trigger when expanded (e.g. “View all”). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CollapsibleBrowseSection({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  action,
  children,
  className,
}: Props) {
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  return (
    <section className={cn(className)}>
      <h3 className="m-0 font-headline text-lg font-bold sm:text-xl">
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={TRIGGER_CLASS}
        >
          {icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block">{title}</span>
            {subtitle ? (
              <span className="mt-0.5 block text-xs font-normal text-[var(--color-text-tertiary)]">
                {subtitle}
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "material-symbols-outlined shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          >
            expand_more
          </span>
        </button>
      </h3>

      {action && open ? <div className="mt-2 pl-[3.25rem]">{action}</div> : null}

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        className="pt-4"
      >
        {children}
      </div>
    </section>
  );
}
