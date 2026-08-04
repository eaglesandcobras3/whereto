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
      ? "h-11 w-11 sm:h-12 sm:w-12 [&_.material-symbols-outlined]:!text-[1.35rem] sm:[&_.material-symbols-outlined]:!text-[1.55rem]"
      : "h-[62px] w-[62px] sm:h-[84px] sm:w-[84px] [&_.material-symbols-outlined]:!text-[2rem] sm:[&_.material-symbols-outlined]:!text-[2.625rem]";

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
  const titleId = "town-at-a-glance-heading";
  const highlightsId = "town-at-a-glance-highlights";

  return (
    <section
      className="text-[var(--tg-body)]"
      aria-labelledby={titleId}
      style={GLANCE_VARS}
    >
      <header className="mb-7">
        <p className="mb-2.5 text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-[var(--tg-navy)]">
          Town Profile
        </p>
        <h2
          id={titleId}
          className="font-headline m-0 text-[clamp(2.4rem,5vw,3.75rem)] font-medium leading-[1.05] tracking-[-0.035em] text-[var(--tg-navy)]"
        >
          {townName} at a glance
        </h2>
        <p className="mt-4 max-w-[820px] text-[clamp(1rem,1.7vw,1.35rem)] leading-[1.55]">
          {facts.description}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-3">
        {facts.metrics.map((metric, metricIndex) => {
          const tone = METRIC_TONES[metricIndex % METRIC_TONES.length];
          return (
            <article
              key={metric.label}
              className="grid min-h-0 grid-cols-[64px_1fr] items-center gap-4 rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] px-[18px] py-[22px] sm:min-h-[220px] sm:grid-cols-[92px_1fr] sm:gap-[22px] sm:p-[30px] lg:min-h-[220px]"
            >
              <IconCircle tone={tone}>
                <MsIcon name={metric.icon} />
              </IconCircle>
              <div className="min-w-0">
                <p className="m-0 mb-2 text-base text-[var(--tg-navy)]">{metric.label}</p>
                <h3 className="font-headline m-0 text-[clamp(1.55rem,2vw,2rem)] leading-[1.2] font-semibold text-[var(--tg-navy)]">
                  {metric.value}
                </h3>
                {metric.subtext ? (
                  <p className="mt-3 text-base leading-[1.55]">{metric.subtext}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {facts.highlights.length > 0 ? (
        <section
          className="mt-[22px] rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] px-[18px] py-5 sm:px-7 sm:pb-[26px] sm:pt-[22px]"
          aria-labelledby={highlightsId}
        >
          <div className="flex items-center gap-3.5">
            <IconCircle tone="gold" size="sm">
              <MsIcon name="star" />
            </IconCircle>
            <h3
              id={highlightsId}
              className="font-headline m-0 text-xl font-semibold text-[var(--tg-navy)]"
            >
              Highlights
            </h3>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 sm:pl-[62px]">
            {facts.highlights.map((label) => (
              <span
                key={label}
                className="inline-flex min-h-[38px] items-center rounded-full border border-[var(--tg-tag-border)] bg-[#fffdfa] px-[18px] py-2 text-[0.92rem] text-[var(--tg-navy)]"
              >
                {label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-[22px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {facts.details.map((detail, detailIndex) => {
          const tone = toneForDetail(detail.title, detailIndex);
          return (
            <article
              key={detail.title}
              className="min-h-0 rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] p-[22px] lg:min-h-[300px]"
            >
              <div className="flex items-center gap-3.5 border-b border-[var(--tg-border)] pb-4">
                <IconCircle tone={tone} size="sm">
                  <MsIcon name={detail.icon} />
                </IconCircle>
                <h3 className="font-headline m-0 text-xl font-semibold text-[var(--tg-navy)]">
                  {detail.title}
                </h3>
              </div>
              <p className="mt-5 text-base leading-[1.65]">{detail.body}</p>
            </article>
          );
        })}
      </div>

      <aside
        className="mt-[18px] flex items-start gap-4 rounded-2xl border border-[var(--tg-border)] bg-[linear-gradient(145deg,#ffffff,var(--tg-soft))] px-5 py-4"
        aria-label="Information disclaimer"
      >
        <div
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-2 border-[var(--tg-navy)] text-[var(--tg-navy)]"
          aria-hidden
        >
          <MsIcon name="info" className="!text-lg" />
        </div>
        <p className="m-0 text-[0.92rem] leading-[1.55]">
          <strong className="text-[var(--tg-navy)]">Disclaimer:</strong> Information
          provided is for general guidance only and may change. Always verify details
          directly with your rental property, local city, government, property
          association, or other official sources before making plans.
        </p>
      </aside>
    </section>
  );
}
