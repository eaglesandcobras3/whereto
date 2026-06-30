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
    <section className="space-y-8 md:space-y-10">
      <div className="dls-section-header max-w-3xl">
        {eyebrow ? <p className="text-eyebrow">{eyebrow}</p> : null}
        <h2 className="text-display-md text-[var(--color-text-primary)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-body-md max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
