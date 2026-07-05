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
        icon="info"
        title={`What to know about ${townName}`}
        meta={<span className="text-eyebrow font-normal normal-case tracking-normal">Before you go</span>}
        preview="Beach access, parking, and whether this town matches how you like to spend a week on 30A."
        className="bg-[var(--color-surface-container-low)]"
      >
        <div className="space-y-8">
          <div>
            <h3 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
              Good fit if you want
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-headline text-base font-bold text-[var(--color-text-primary)]">
                Getting to the beach
              </h3>
              <p className="prose-editorial mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {profile.beachAccess}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-headline text-base font-bold text-[var(--color-text-primary)]">
                Parking
              </h3>
              <p className="prose-editorial mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {profile.parking}
              </p>
            </div>
          </div>

          {profile.diningStyle ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-headline text-base font-bold text-[var(--color-text-primary)]">
                Where to eat
              </h3>
              <p className="prose-editorial mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {profile.diningStyle}
              </p>
            </div>
          ) : null}

          {profile.nearbyTowns && profile.nearbyTowns.length > 0 ? (
            <div>
              <h3 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
                Worth pairing with
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {profile.nearbyTowns.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/${t.slug}`}
                      {...gaClickProps({
                        event: "nav_click",
                        category: "town_planning_nearby",
                        label: t.slug,
                      })}
                      className="editorial-card group flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition-all hover:border-[var(--color-primary)]"
                    >
                      <span className="font-semibold text-[var(--color-primary)] group-hover:underline">
                        {t.name}
                      </span>
                      {t.note ? (
                        <span className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                          {t.note}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {profile.relatedGuideSlugs && profile.relatedGuideSlugs.length > 0 ? (
            <div>
              <h3 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
                Related guides
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {profile.relatedGuideSlugs.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/guide/${slug}`}
                      {...gaClickProps({
                        event: "nav_click",
                        category: "town_planning_guide",
                        label: slug,
                      })}
                      className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)]"
                    >
                      {slug.replace(/-/g, " ")}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {profile.faqs && profile.faqs.length > 0 ? (
            <div>
              <h3 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
                Common questions
              </h3>
              <dl className="mt-4 space-y-3">
                {profile.faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
                  >
                    <dt className="font-semibold text-[var(--color-text-primary)]">{faq.question}</dt>
                    <dd className="prose-editorial mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
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
