import { highlightIcon, type TownFacts } from "@/lib/data/town-facts";

type Props = {
  townName: string;
  facts: TownFacts;
};

function MsIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`} aria-hidden>
      {name}
    </span>
  );
}

/** Town profile “at a glance” — metrics, highlights, and detail cards. */
export function TownAtAGlanceSection({ townName, facts }: Props) {
  return (
    <section
      className="space-y-6 sm:space-y-8"
      aria-labelledby="town-at-a-glance-heading"
    >
      <header className="max-w-3xl">
        <p className="text-eyebrow mb-2">Town profile</p>
        <h2
          id="town-at-a-glance-heading"
          className="font-headline text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl"
        >
          {townName} at a glance
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-3 sm:text-base">
          {facts.description}
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {facts.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-5 sm:py-5"
          >
            <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
              <MsIcon name={metric.icon} className="!text-base text-[var(--color-primary)]" />
              {metric.label}
            </dt>
            <dd className="mt-2">
              <p className="font-headline text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
                {metric.value}
              </p>
              {metric.subtext ? (
                <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-secondary)] sm:text-sm">
                  {metric.subtext}
                </p>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {facts.highlights.length > 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="flex items-center gap-1.5 font-headline text-base font-semibold text-[var(--color-text-primary)] sm:text-lg">
            <MsIcon name="star" className="!text-lg text-[var(--color-primary)]" />
            Highlights
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-2.5">
            {facts.highlights.map((label) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] sm:text-sm"
              >
                <MsIcon
                  name={highlightIcon(label)}
                  className="!text-sm text-[var(--color-primary)]"
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {facts.details.map((detail) => (
          <article
            key={detail.title}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-5 sm:py-5"
          >
            <h3 className="flex items-center gap-1.5 font-headline text-sm font-semibold text-[var(--color-text-primary)] sm:text-base">
              <MsIcon name={detail.icon} className="!text-lg text-[var(--color-primary)]" />
              {detail.title}
            </h3>
            <div
              className="my-3 h-px w-full bg-[var(--color-border)]"
              aria-hidden
            />
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {detail.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
