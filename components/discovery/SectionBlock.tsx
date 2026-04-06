import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  /** Small caps label above the title (Apple-style section preface). */
  eyebrow?: string;
  children: ReactNode;
};

export function SectionBlock({ title, subtitle, eyebrow, children }: Props) {
  return (
    <section className="space-y-6 md:space-y-8">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-eyebrow mb-3">{eyebrow}</p> : null}
        <h2 className="text-section text-[var(--color-text-primary)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
