import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionBlock({ title, subtitle, children }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-section text-[var(--color-text-primary)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
