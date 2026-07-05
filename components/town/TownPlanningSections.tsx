"use client";

import Link from "next/link";
import type { TownPlanningProfile } from "@/lib/data/town-planning";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { generateFaqSchema } from "@/lib/seo/breadcrumb-schema";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

type Props = {
  townName: string;
  profile: TownPlanningProfile;
};

function previewText(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

export function TownPlanningSections({ townName, profile }: Props) {
  const faqSchema =
    profile.faqs && profile.faqs.length > 0
      ? generateFaqSchema(profile.faqs)
      : null;

  const hasNearby = Boolean(profile.nearbyTowns?.length);
  const hasDining = Boolean(profile.diningStyle);
  const hasFaqs = Boolean(profile.faqs?.length);
  const nearbyPreview = profile.nearbyTowns?.map((t) => t.name).join(", ");

  return (
    <>
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-low)] shadow-premium-sm">
        <header className="border-b border-[var(--color-border)] p-5 sm:p-6">
          <p className="text-eyebrow mb-2">Town profile</p>
          <h2 className="text-editorial-headline text-2xl text-primary sm:text-3xl">
            {townName} at a glance
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--color-text-primary)]">
            {profile.vibe}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {profile.quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 sm:px-3.5 sm:py-3"
              >
                <dt className="flex items-center gap-1 text-[0.6875rem] font-medium text-[var(--color-text-tertiary)] sm:text-xs">
                  <span className="material-symbols-outlined !text-sm text-[var(--color-primary)]">
                    {fact.icon}
                  </span>
                  {fact.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold leading-snug text-[var(--color-text-primary)]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="px-4 sm:px-6">
          <CollapsibleSection
            variant="plain"
            headingLevel={3}
            defaultOpen={false}
            icon="thumb_up"
            title="Good fit if you want"
            preview={profile.bestFor.slice(0, 3).join(" · ")}
          >
            <ul className="flex flex-wrap gap-2">
              {profile.bestFor.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection
            variant="plain"
            headingLevel={3}
            defaultOpen={false}
            icon="beach_access"
            title="Beach"
            preview={
              profile.quickFacts.find((f) => f.label === "Beach")?.value ??
              previewText(profile.beachAccess)
            }
          >
            <p className="prose-editorial text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {profile.beachAccess}
            </p>
          </CollapsibleSection>

          <CollapsibleSection
            variant="plain"
            headingLevel={3}
            defaultOpen={false}
            icon="local_parking"
            title="Parking"
            preview={previewText(profile.parking)}
          >
            <p className="prose-editorial text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {profile.parking}
            </p>
          </CollapsibleSection>

          {hasDining ? (
            <CollapsibleSection
              variant="plain"
              headingLevel={3}
              defaultOpen={false}
              icon="restaurant"
              title="Dining"
              preview={
                profile.quickFacts.find((f) => f.label === "Dining")?.value ??
                previewText(profile.diningStyle!)
              }
            >
              <p className="prose-editorial text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {profile.diningStyle}
              </p>
            </CollapsibleSection>
          ) : null}

          {hasNearby ? (
            <CollapsibleSection
              variant="plain"
              headingLevel={3}
              defaultOpen={false}
              icon="near_me"
              title="Nearby towns"
              preview={nearbyPreview}
            >
              <ul className="grid gap-2 sm:grid-cols-2">
                {profile.nearbyTowns!.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/${t.slug}`}
                      {...gaClickProps({
                        event: "nav_click",
                        category: "town_planning_nearby",
                        label: t.slug,
                      })}
                      className="editorial-card group flex items-baseline justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm transition-all hover:border-[var(--color-primary)]"
                    >
                      <span className="font-semibold text-[var(--color-primary)] group-hover:underline">
                        {t.name}
                      </span>
                      {t.note ? (
                        <span className="text-right text-xs leading-snug text-[var(--color-text-secondary)]">
                          {t.note}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          ) : null}

          {hasFaqs
            ? profile.faqs!.map((faq, index) => (
                <CollapsibleSection
                  key={faq.question}
                  variant="plain"
                  headingLevel={3}
                  defaultOpen={false}
                  icon="help"
                  title={faq.question}
                  preview={previewText(faq.answer)}
                  trimTrailingSpace={index === profile.faqs!.length - 1}
                >
                  <p className="prose-editorial text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {faq.answer}
                  </p>
                </CollapsibleSection>
              ))
            : null}

          {!hasFaqs ? (
            <CollapsibleSection
              variant="plain"
              headingLevel={3}
              defaultOpen={false}
              title=""
              trimTrailingSpace
              className="hidden"
            >
              {null}
            </CollapsibleSection>
          ) : null}
        </div>
      </section>
    </>
  );
}
