import type { CSSProperties, ReactNode } from "react";

import type { AtAGlanceFacts } from "@/lib/data/at-a-glance-facts";

type Props = {
  placeName: string;
  facts: AtAGlanceFacts;
  /** Unique DOM id prefix so town + area sections can coexist in tests. */
  idPrefix?: string;
};

type IconTone = "lavender" | "blue" | "green" | "peach" | "gold";

const GLANCE_VARS = {
  "--tg-navy": "#0d234f",
  "--tg-body": "#263b63",
  "--tg-border": "#dce4f3",
  "--tg-soft": "#fbfcff",
  "--tg-lavender": "#eeeafd",
  "--tg-blue": "#e2f0ff",
  "--tg-green": "#e5f4e8",
  "--tg-peach": "#ffe5d7",
  "--tg-gold": "#fff0ce",
  "--tg-gold-fg": "#ca8400",
  "--tg-tag-border": "#efd8a5",
} as CSSProperties;

const METRIC_TONES: IconTone[] = ["lavender", "blue", "peach"];

const DETAIL_TONES: Record<string, IconTone> = {
  "dining & town center": "peach",
  parking: "lavender",
};

const TONE_BG: Record<IconTone, string> = {
  lavender: "bg-[var(--tg-lavender)]",
  blue: "bg-[var(--tg-blue)]",
  green: "bg-[var(--tg-green)]",
  peach: "bg-[var(--tg-peach)]",
  gold: "bg-[var(--tg-gold)] text-[var(--tg-gold-fg)]",
};

function MsIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`} aria-hidden>
      {name}
    </span>
  );
}

function IconCircle({
  tone,
  size = "lg",
  children,
}: {
  tone: IconTone;
  size?: "lg" | "sm";
  children: ReactNode;
}) {
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 [&_.material-symbols-outlined]:!text-lg"
      : "h-11 w-11 sm:h-12 sm:w-12 [&_.material-symbols-outlined]:!text-[1.35rem] sm:[&_.material-symbols-outlined]:!text-[1.5rem]";

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full text-[var(--tg-navy)] ${TONE_BG[tone]} ${sizeClass}`}
      aria-hidden
    >
      {children}
    </div>
  );
}

function toneForDetail(title: string, index: number): IconTone {
  return DETAIL_TONES[title.trim().toLowerCase()] ?? METRIC_TONES[index % METRIC_TONES.length];
}

/** Shared place profile “at a glance” — metrics, highlights, detail cards, and disclaimer. */
export function AtAGlanceSection({
  placeName,
  facts,
  idPrefix = "at-a-glance",
}: Props) {
  const headingId = `${idPrefix}-heading`;
  const highlightsId = `${idPrefix}-highlights`;

  return (
    <section
      className="text-[var(--tg-body)]"
      aria-labelledby={headingId}
      style={GLANCE_VARS}
    >
      <header className="mb-4 sm:mb-5">
        <h2
          id={headingId}
          className="font-headline m-0 text-xl font-bold text-[var(--tg-navy)] sm:text-2xl"
        >
          {placeName} at a glance
        </h2>
      </header>

      <dl className="m-0 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {facts.metrics.map((metric, metricIndex) => {
          const tone = METRIC_TONES[metricIndex % METRIC_TONES.length];
          return (
            <div
              key={metric.label}
              className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] px-4 py-4 sm:grid-cols-[52px_1fr] sm:gap-4 sm:px-5 sm:py-5"
            >
              <IconCircle tone={tone}>
                <MsIcon name={metric.icon} />
              </IconCircle>
              <div className="min-w-0">
                <dt className="m-0 text-sm text-[var(--tg-navy)]">{metric.label}</dt>
                <dd className="m-0 mt-0.5">
                  <p className="font-headline m-0 text-base font-semibold leading-snug text-[var(--tg-navy)] sm:text-lg">
                    {metric.value}
                  </p>
                  {metric.subtext ? (
                    <p className="mt-1.5 text-sm leading-relaxed">{metric.subtext}</p>
                  ) : null}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      {facts.highlights.length > 0 ? (
        <section
          className="mt-4 rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] px-4 py-4 sm:mt-5 sm:px-5 sm:py-5"
          aria-labelledby={highlightsId}
        >
          <div className="flex items-center gap-3">
            <IconCircle tone="gold" size="sm">
              <MsIcon name="star" />
            </IconCircle>
            <h3
              id={highlightsId}
              className="font-headline m-0 text-base font-semibold text-[var(--tg-navy)] sm:text-lg"
            >
              Highlights
            </h3>
          </div>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 sm:mt-4 sm:pl-12">
            {facts.highlights.map((label) => (
              <li
                key={label}
                className="inline-flex min-h-8 items-center rounded-full border border-[var(--tg-tag-border)] bg-[#fffdfa] px-3.5 py-1.5 text-sm text-[var(--tg-navy)]"
              >
                {label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-2">
        {facts.details.map((detail, detailIndex) => {
          const tone = toneForDetail(detail.title, detailIndex);
          return (
            <article
              key={detail.title}
              className="rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] p-4 sm:p-5"
            >
              <div className="flex items-center gap-3 border-b border-[var(--tg-border)] pb-3">
                <IconCircle tone={tone} size="sm">
                  <MsIcon name={detail.icon} />
                </IconCircle>
                <h3 className="font-headline m-0 text-base font-semibold text-[var(--tg-navy)] sm:text-lg">
                  {detail.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{detail.body}</p>
            </article>
          );
        })}
      </div>

      <p
        className="mt-4 text-[0.6875rem] leading-relaxed text-[var(--color-text-tertiary)] sm:mt-5 sm:text-xs"
        role="note"
      >
        Disclaimer: Information provided is for general guidance only and may change.
        Always verify details directly with your rental property, local city, government,
        property association, or other official sources before making plans.
      </p>
    </section>
  );
}
