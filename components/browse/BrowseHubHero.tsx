import type { ReactNode } from "react";
import { CollapsibleText } from "@/components/ui/collapsible-text";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: ReactNode;
  collapsibleDescription?: string;
  eyebrow?: string;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function BrowseHubHero({
  title,
  description,
  collapsibleDescription,
  eyebrow = "30A · South Walton, Florida",
  meta,
  children,
  className,
}: Props) {
  return (
    <div className={cn("coastal-hero border-b border-[var(--color-border)]", className)}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 md:px-10">
        <header className="max-w-3xl space-y-3">
          <p className="text-eyebrow">{eyebrow}</p>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl md:text-4xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
            {description}
          </p>
          {collapsibleDescription ? (
            <CollapsibleText
              text={collapsibleDescription}
              className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]"
            />
          ) : null}
          {meta ? <div className="text-sm text-[var(--color-text-tertiary)]">{meta}</div> : null}
          {children}
        </header>
      </div>
    </div>
  );
}
