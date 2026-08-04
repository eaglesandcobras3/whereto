import type { CSSProperties, ReactNode } from "react";

import type { TownFacts } from "@/lib/data/town-facts";

type Props = {
  townName: string;
  facts: TownFacts;
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
  "beach access": "blue",
  "private beach": "blue",
  "public beach": "blue",
  "getting around": "green",
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

/** Town profile “at a glance” — metrics, highlights, detail cards, and disclaimer. */
export function TownAtAGlanceSection({ townName, facts }: Props) {
  const highlightsId = "town-at-a-glance-highlights";

  return (
    <section
      className="text-[var(--tg-body)]"
      aria-label={`${townName} at a glance`}
      style={GLANCE_VARS}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {facts.metrics.map((metric, metricIndex) => {
          const tone = METRIC_TONES[metricIndex % METRIC_TONES.length];
          return (
            <article
              key={metric.label}
              className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] px-4 py-4 sm:grid-cols-[52px_1fr] sm:gap-4 sm:px-5 sm:py-5"
            >
              <IconCircle tone={tone}>
                <MsIcon name={metric.icon} />
              </IconCircle>
              <div className="min-w-0">
                <p className="m-0 text-sm text-[var(--tg-navy)]">{metric.label}</p>
                <h3 className="font-headline m-0 mt-0.5 text-base font-semibold leading-snug text-[var(--tg-navy)] sm:text-lg">
                  {metric.value}
                </h3>
                {metric.subtext ? (
                  <p className="mt-1.5 text-sm leading-relaxed">{metric.subtext}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

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
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:pl-12">
            {facts.highlights.map((label) => (
              <span
                key={label}
                className="inline-flex min-h-8 items-center rounded-full border border-[var(--tg-tag-border)] bg-[#fffdfa] px-3.5 py-1.5 text-sm text-[var(--tg-navy)]"
              >
                {label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-2 lg:grid-cols-4">
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

      <aside
        className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] px-4 py-3.5 sm:mt-5"
        aria-label="Information disclaimer"
      >
        <div
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--tg-navy)] text-[var(--tg-navy)]"
          aria-hidden
        >
          <MsIcon name="info" className="!text-base" />
        </div>
        <p className="m-0 text-sm leading-relaxed">
          <strong className="text-[var(--tg-navy)]">Disclaimer:</strong> Information
          provided is for general guidance only and may change. Always verify details
          directly with your rental property, local city, government, property
          association, or other official sources before making plans.
        </p>
      </aside>
    </section>
  );
}
