import Link from "next/link";
import type { TownPlanningProfile } from "@/lib/data/town-planning";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { generateFaqSchema } from "@/lib/seo/breadcrumb-schema";

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
    <div className="space-y-10">
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}

      <section>
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          What {townName} is best for
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {profile.bestFor.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-3 py-1 text-sm text-[var(--color-text-secondary)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
            Beach access
          </h2>
          <p className="prose-editorial mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
            {profile.beachAccess}
          </p>
        </div>
        <div>
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
            Parking & crowds
          </h2>
          <p className="prose-editorial mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
            {profile.parking}
          </p>
        </div>
      </section>

      {profile.diningStyle ? (
        <section>
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
            Dining style
          </h2>
          <p className="prose-editorial mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
            {profile.diningStyle}
          </p>
        </section>
      ) : null}

      {profile.nearbyTowns && profile.nearbyTowns.length > 0 ? (
        <section>
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
            Nearby pairings
          </h2>
          <ul className="mt-3 space-y-2">
            {profile.nearbyTowns.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/${t.slug}`}
                  {...gaClickProps({
                    event: "nav_click",
                    category: "town_planning_nearby",
                    label: t.slug,
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  {t.name}
                </Link>
                {t.note ? (
                  <span className="text-sm text-[var(--color-text-secondary)]"> — {t.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.relatedGuideSlugs && profile.relatedGuideSlugs.length > 0 ? (
        <section>
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
            Related guides
          </h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {profile.relatedGuideSlugs.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/guide/${slug}`}
                  {...gaClickProps({
                    event: "nav_click",
                    category: "town_planning_guide",
                    label: slug,
                  })}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  {slug.replace(/-/g, " ")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.faqs && profile.faqs.length > 0 ? (
        <section>
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)]">
            Frequently asked questions
          </h2>
          <dl className="mt-4 space-y-4">
            {profile.faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="font-semibold text-[var(--color-text-primary)]">{faq.question}</dt>
                <dd className="prose-editorial mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
