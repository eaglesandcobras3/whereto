import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function RecommendationCarousel({
  title,
  subtitle,
  children,
  className,
}: Props) {
  return (
    <section className={className ?? "space-y-3"}>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
