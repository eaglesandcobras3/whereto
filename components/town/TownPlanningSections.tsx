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

export function TownPlanningSections({ townName, profile }: Props) {
  const faqSchema =
    profile.faqs && profile.faqs.length > 0
      ? generateFaqSchema(profile.faqs)
      : null;

  return (
    <>
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}

      <CollapsibleSection
        variant="card"
        headingLevel={2}
        defaultOpen={false}
        icon="location_city"
        title={`${townName} at a glance`}
        meta={<span className="text-eyebrow font-normal normal-case tracking-normal">Town profile</span>}
        preview={profile.vibe}
        className="bg-[var(--color-surface-container-low)]"
      >
        <div className="space-y-8">
          <p className="text-base leading-relaxed text-[var(--color-text-primary)] sm:text-lg">
            {profile.vibe}
          </p>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {profile.quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4"
              >
                <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
                  <span className="material-symbols-outlined !text-base text-[var(--color-primary)]">
                    {fact.icon}
                  </span>
                  {fact.label}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold leading-snug text-[var(--color-text-primary)]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Good fit if you want
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.bestFor.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Beach
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {profile.beachAccess}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Parking
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {profile.parking}
              </p>
            </div>
            {profile.diningStyle ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:col-span-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Dining
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {profile.diningStyle}
                </p>
              </div>
            ) : null}
          </div>

          {profile.nearbyTowns && profile.nearbyTowns.length > 0 ? (
            <div>
              <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Nearby towns
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {profile.nearbyTowns.map((t) => (
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
            </div>
          ) : null}

          {profile.faqs && profile.faqs.length > 0 ? (
            <div>
              <h3 className="font-headline text-sm font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Quick answers
              </h3>
              <dl className="mt-3 divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                {profile.faqs.map((faq) => (
                  <div key={faq.question} className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <dt className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {faq.question}
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </CollapsibleSection>
    </>
  );
}
