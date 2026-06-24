import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  layout?: "grid" | "stack";
};

export function PlaceRelatedSection({
  title,
  description,
  children,
  className,
  layout = "grid",
}: Props) {
  return (
    <section className={cn(className)}>
      <div className="mb-4 sm:mb-5">
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
            {description}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          layout === "stack"
            ? "flex flex-col gap-3 sm:gap-4"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3",
        )}
      >
        {children}
      </div>
    </section>
  );
}
