"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlacePlanningProfile } from "@/lib/data/place-planning";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { townPagePath } from "@/lib/routes/town-page-path";
import { generateFaqSchema } from "@/lib/seo/breadcrumb-schema";
import { LinkifiedTownText } from "@/components/seo/LinkifiedTownText";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";

type Props = {
  placeName: string;
  profile: PlacePlanningProfile;
  profileLabel: string;
  /** When set, inline town links skip this slug (town detail self-link). */
  placeSlug?: string;
  accessSectionTitle?: string;
  nearbySectionTitle?: string;
  nearbyAnalyticsCategory?: string;
};

function previewText(text: string, max = 64): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function MsIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`} aria-hidden>
      {name}
    </span>
  );
}

export function PlaceProfileSections({
  placeName,
  profile,
  profileLabel,
  placeSlug,
  accessSectionTitle = "Beach",
  nearbySectionTitle = "Nearby",
  nearbyAnalyticsCategory = "place_profile_nearby",
}: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const faqSchema =
    profile.faqs && profile.faqs.length > 0
      ? generateFaqSchema(profile.faqs)
      : null;

  const nearbyLinks =
    profile.nearbyLinks ??
    profile.nearbyTowns?.map((t) => ({
      name: t.name,
      href: townPagePath(t.slug),
      note: t.note,
    })) ??
    [];

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const accessPreview =
    profile.quickFacts.find((f) => f.label === "Beach")?.value ??
    previewText(profile.beachAccess);

  const linkifyCategory = nearbyAnalyticsCategory.replace(/_nearby$/, "_inline_link");

  function linkedText(text: string) {
    return (
      <LinkifiedTownText
        text={text}
        excludeSlug={placeSlug}
        analyticsCategory={linkifyCategory}
      />
    );
  }

  return (
    <>
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-container-low)] shadow-premium-sm">
        <header className="border-b border-[var(--color-border)] px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-eyebrow mb-2">{profileLabel}</p>
          <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
            {placeName} at a glance
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
            {linkedText(profile.vibe)}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 sm:gap-2.5">
            {profile.quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 sm:px-3 sm:py-2.5"
              >
                <dt className="flex items-center gap-1 text-[0.6875rem] font-medium text-[var(--color-text-tertiary)]">
                  <MsIcon name={fact.icon} className="!text-sm text-[var(--color-primary)]" />
                  {fact.label}
                </dt>
                <dd className="mt-1 text-xs font-semibold leading-snug text-[var(--color-text-primary)] sm:text-sm">
                  {linkedText(fact.value)}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="divide-y divide-[var(--color-border)] px-4 sm:px-6">
          <CollapsibleBrowseSection
            compact
            title="Good fit if you want"
            subtitle={profile.bestFor.slice(0, 2).join(" · ")}
            icon={<MsIcon name="thumb_up" className="text-lg" />}
            open={openIds.has("fit")}
            onToggle={() => toggle("fit")}
            className="py-3 sm:py-3.5"
          >
            <ul className="flex flex-wrap gap-2">
              {profile.bestFor.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] sm:text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CollapsibleBrowseSection>

          <CollapsibleBrowseSection
            compact
            title={accessSectionTitle}
            subtitle={accessPreview}
            icon={<MsIcon name="beach_access" className="text-lg" />}
            open={openIds.has("access")}
            onToggle={() => toggle("access")}
            className="py-3 sm:py-3.5"
          >
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {linkedText(profile.beachAccess)}
            </p>
          </CollapsibleBrowseSection>

          <CollapsibleBrowseSection
            compact
            title="Parking"
            subtitle={previewText(profile.parking)}
            icon={<MsIcon name="local_parking" className="text-lg" />}
            open={openIds.has("parking")}
            onToggle={() => toggle("parking")}
            className="py-3 sm:py-3.5"
          >
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {linkedText(profile.parking)}
            </p>
          </CollapsibleBrowseSection>

          {profile.diningStyle ? (
            <CollapsibleBrowseSection
              compact
              title="Dining"
              subtitle={
                profile.quickFacts.find((f) => f.label === "Dining")?.value ??
                previewText(profile.diningStyle)
              }
              icon={<MsIcon name="restaurant" className="text-lg" />}
              open={openIds.has("dining")}
              onToggle={() => toggle("dining")}
              className="py-3 sm:py-3.5"
            >
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {linkedText(profile.diningStyle)}
              </p>
            </CollapsibleBrowseSection>
          ) : null}

          {nearbyLinks.length > 0 ? (
            <CollapsibleBrowseSection
              compact
              title={nearbySectionTitle}
              subtitle={nearbyLinks.map((t) => t.name).join(", ")}
              icon={<MsIcon name="near_me" className="text-lg" />}
              open={openIds.has("nearby")}
              onToggle={() => toggle("nearby")}
              className="py-3 sm:py-3.5"
            >
              <ul className="grid gap-2 sm:grid-cols-2">
                {nearbyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      {...gaClickProps({
                        event: "nav_click",
                        category: nearbyAnalyticsCategory,
                        label: link.href,
                      })}
                      className="group flex items-baseline justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-colors hover:border-[var(--color-primary)]"
                    >
                      <span className="text-sm font-semibold text-[var(--color-primary)] group-hover:underline">
                        {link.name}
                      </span>
                      {link.note ? (
                        <span className="text-right text-xs leading-snug text-[var(--color-text-secondary)]">
                          {link.note}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </CollapsibleBrowseSection>
          ) : null}

          {profile.faqs?.map((faq, index) => (
            <CollapsibleBrowseSection
              key={faq.question}
              compact
              title={faq.question}
              subtitle={previewText(faq.answer)}
              icon={<MsIcon name="help" className="text-lg" />}
              open={openIds.has(`faq-${index}`)}
              onToggle={() => toggle(`faq-${index}`)}
              className="py-3 sm:py-3.5"
            >
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {linkedText(faq.answer)}
              </p>
            </CollapsibleBrowseSection>
          ))}
        </div>
      </section>
    </>
  );
}
