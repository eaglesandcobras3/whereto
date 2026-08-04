import type { CSSProperties } from "react";

import { highlightIcon, type TownFacts } from "@/lib/data/town-facts";

type Props = {
  townName: string;
  facts: TownFacts;
};

type Tone = {
  iconBg: string;
  iconColor: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
};

const GLANCE_VARS = {
  "--town-glance-primary": "#061637",
  "--town-glance-title": "#131b2e",
  "--town-glance-copy": "#45464e",
  "--town-glance-muted": "#636a80",
  "--town-glance-border": "#d7def5",
  "--town-glance-surface": "#faf8ff",
  "--town-glance-card": "#ffffff",
  "--town-glance-panel": "#f2f3ff",
  "--town-glance-panel-strong": "#eaedff",
  "--town-glance-star-bg": "#fff2d9",
  "--town-glance-star-fg": "#9b6200",
} as CSSProperties;

const METRIC_TONES: Tone[] = [
  {
    iconBg: "#f0e9ff",
    iconColor: "#6451b3",
    chipBg: "#f6f0ff",
    chipBorder: "#d8c8ff",
    chipText: "#52419f",
  },
  {
    iconBg: "#e9f2ff",
    iconColor: "#3560ad",
    chipBg: "#eff5ff",
    chipBorder: "#c4d7ff",
    chipText: "#2d5598",
  },
  {
    iconBg: "#e8f8ef",
    iconColor: "#2d7a58",
    chipBg: "#edf9f2",
    chipBorder: "#bfe7d0",
    chipText: "#2f6f53",
  },
  {
    iconBg: "#fff1e8",
    iconColor: "#a35a37",
    chipBg: "#fff5ef",
    chipBorder: "#ffd8c2",
    chipText: "#945333",
  },
];

const DETAIL_TONES: Record<string, Tone> = {
  "beach access": {
    iconBg: "#e8f1ff",
    iconColor: "#2f5fa8",
    chipBg: "#edf4ff",
    chipBorder: "#c4d7ff",
    chipText: "#2f5fa8",
  },
  "getting around": {
    iconBg: "#e8f8ef",
    iconColor: "#2c7c58",
    chipBg: "#edf9f2",
    chipBorder: "#bfe7d0",
    chipText: "#2c7c58",
  },
  "dining & town center": {
    iconBg: "#fff1e8",
    iconColor: "#a35a37",
    chipBg: "#fff5ef",
    chipBorder: "#ffd8c2",
    chipText: "#a35a37",
  },
  parking: {
    iconBg: "#f1ebff",
    iconColor: "#6b50af",
    chipBg: "#f6f0ff",
    chipBorder: "#d8c8ff",
    chipText: "#6b50af",
  },
};

function toneByIndex(index: number): Tone {
  return METRIC_TONES[index % METRIC_TONES.length];
}

function toneForDetail(title: string, index: number): Tone {
  return DETAIL_TONES[title.trim().toLowerCase()] ?? toneByIndex(index);
}

function toneForHighlight(label: string, index: number): Tone {
  const lower = label.trim().toLowerCase();
  if (lower.includes("coffee") || lower.includes("dining")) return METRIC_TONES[2];
  if (lower.includes("bike") || lower.includes("walk")) return METRIC_TONES[1];
  if (lower.includes("event")) return METRIC_TONES[3];
  return toneByIndex(index);
}

function MsIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      aria-hidden
      style={style}
    >
      {name}
    </span>
  );
}

/** Town profile “at a glance” — metrics, highlights, and detail cards. */
export function TownAtAGlanceSection({ townName, facts }: Props) {
  return (
    <section
      className="space-y-6 rounded-3xl bg-[var(--town-glance-surface)] p-4 sm:space-y-8 sm:p-6"
      aria-labelledby="town-at-a-glance-heading"
      style={GLANCE_VARS}
    >
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--town-glance-muted)]">
          Town profile
        </p>
        <h2
          id="town-at-a-glance-heading"
          className="font-headline text-4xl font-bold tracking-[-0.02em] text-[var(--town-glance-title)] sm:text-5xl"
        >
          {townName} at a glance
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--town-glance-copy)] sm:text-[1.4rem] sm:leading-9">
          {facts.description}
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {facts.metrics.map((metric, metricIndex) => {
          const tone = toneByIndex(metricIndex);
          return (
          <div
            key={metric.label}
            className="rounded-2xl border border-[var(--town-glance-border)] bg-[var(--town-glance-card)] px-4 py-4 shadow-[0_2px_14px_rgba(6,22,55,0.04)] sm:px-5 sm:py-5"
          >
            <dt className="flex items-center gap-3">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: tone.iconBg, color: tone.iconColor }}
              >
                <MsIcon name={metric.icon} className="!text-[1.35rem]" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--town-glance-copy)]">{metric.label}</p>
                <p className="font-headline text-[1.75rem] leading-8 font-bold tracking-[-0.02em] text-[var(--town-glance-title)]">
                  {metric.value}
                </p>
              </div>
            </dt>
            <dd className="mt-2 pl-14">
              {metric.subtext ? (
                <p className="text-sm leading-snug text-[var(--town-glance-copy)]">
                  {metric.subtext}
                </p>
              ) : null}
            </dd>
          </div>
          );
        })}
      </dl>

      {facts.highlights.length > 0 ? (
        <div className="rounded-2xl border border-[var(--town-glance-border)] bg-[var(--town-glance-card)] px-4 py-4 shadow-[0_2px_14px_rgba(6,22,55,0.04)] sm:px-6 sm:py-5">
          <h3 className="flex items-center gap-2 font-headline text-xl font-semibold text-[var(--town-glance-title)]">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                backgroundColor: "var(--town-glance-star-bg)",
                color: "var(--town-glance-star-fg)",
              }}
            >
              <MsIcon name="star" className="!text-lg" />
            </span>
            Highlights
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-2.5">
            {facts.highlights.map((label, highlightIndex) => {
              const tone = toneForHighlight(label, highlightIndex);
              return (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium sm:text-sm"
                  style={{
                    backgroundColor: tone.chipBg,
                    borderColor: tone.chipBorder,
                    color: tone.chipText,
                  }}
                >
                  <MsIcon
                    name={highlightIcon(label)}
                    className="!text-sm"
                    style={{ color: tone.iconColor }}
                  />
                  {label}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {facts.details.map((detail, detailIndex) => {
          const tone = toneForDetail(detail.title, detailIndex);
          return (
          <article
            key={detail.title}
            className="rounded-2xl border border-[var(--town-glance-border)] bg-[var(--town-glance-card)] px-4 py-4 shadow-[0_2px_14px_rgba(6,22,55,0.04)] sm:px-5 sm:py-5"
          >
            <h3 className="flex items-center gap-2 font-headline text-base font-semibold text-[var(--town-glance-title)]">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: tone.iconBg, color: tone.iconColor }}
              >
                <MsIcon name={detail.icon} className="!text-lg" />
              </span>
              {detail.title}
            </h3>
            <div
              className="my-3 h-px w-full bg-[var(--town-glance-border)]"
              aria-hidden
            />
            <p className="text-sm leading-relaxed text-[var(--town-glance-copy)]">
              {detail.body}
            </p>
          </article>
          );
        })}
      </div>
    </section>
  );
}
