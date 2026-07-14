"use client";

import Link from "next/link";
import { isFreeOnboardEnabled, isOnboardEnabled } from "@/lib/feature-flags-core";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { PAGE_SECTION_CONTAINER_CLASS } from "@/lib/layout/page-section";

/**
 * Homepage call-to-action after the neighborhoods / towns strip.
 * Links to the public listing request flow (no markdown images — CSS only).
 */
export function ListBusinessHomeCta() {
  const flags = useAppFeatureFlags();
  const listHref =
    isFreeOnboardEnabled(flags) || !isOnboardEnabled(flags)
      ? "/list-your-business"
      : "/portal/businesses/new";

  return (
    <section
      id="section-list-your-business"
      aria-labelledby="home-list-business-heading"
      className="relative border-y border-[var(--color-border)] bg-[var(--color-background)] py-16 md:py-24"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-24 top-1/2 h-[min(28rem,70vw)] w-[min(28rem,70vw)] -translate-y-1/2 rounded-full bg-[var(--color-primary)]/[0.07] blur-3xl"
        />
        <div
          className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-[var(--color-logo-navy)]/[0.06] blur-3xl md:h-80 md:w-80"
        />
      </div>

      <div className={`relative ${PAGE_SECTION_CONTAINER_CLASS}`}>
        <div className="overflow-hidden rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-sm">
          <div className="grid gap-10 p-8 md:p-12 lg:grid-cols-[1fr,minmax(0,16rem)] lg:gap-14 lg:p-14">
            <div className="min-w-0">
              <p className="text-eyebrow mb-3 text-[var(--color-primary)]">For local businesses</p>
              <h2
                id="home-list-business-heading"
                className="font-headline text-3xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)] md:text-4xl"
              >
                List your business. It&apos;s free on WhereTo30A
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
                Reach travelers and locals who are already budgeting time on Scenic Highway 30A. One short request puts
                your storefront or service in front of visitors planning meals, errands, date nights, and beach weeks.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-text-tertiary)]">
                We review every submission before anything goes live, with the same thoughtful standards as the rest of
                the guide.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={listHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-logo-navy)] px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-primary-light)] md:text-base"
                >
                  <span className="material-symbols-outlined !text-xl" aria-hidden>
                    storefront
                  </span>
                  Add your business
                </Link>
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  No listing fee · quick form
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center border-t border-[var(--color-border)] pt-10 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <dl className="space-y-5 text-sm">
                <div className="flex gap-3">
                  <span
                    className="material-symbols-outlined mt-0.5 shrink-0 text-[var(--color-primary)]"
                    aria-hidden
                  >
                    check_circle
                  </span>
                  <div>
                    <dt className="font-semibold text-[var(--color-text-primary)]">Visible audience</dt>
                    <dd className="mt-1 leading-relaxed text-[var(--color-text-secondary)]">
                      People browsing town hubs, search, and related picks, not a billboard on the interstate.
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span
                    className="material-symbols-outlined mt-0.5 shrink-0 text-[var(--color-primary)]"
                    aria-hidden
                  >
                    handshake
                  </span>
                  <div>
                    <dt className="font-semibold text-[var(--color-text-primary)]">Human review</dt>
                    <dd className="mt-1 leading-relaxed text-[var(--color-text-secondary)]">
                      We verify details so the guide stays trustworthy for neighbors and vacationers alike.
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span
                    className="material-symbols-outlined mt-0.5 shrink-0 text-[var(--color-primary)]"
                    aria-hidden
                  >
                    mail
                  </span>
                  <div>
                    <dt className="font-semibold text-[var(--color-text-primary)]">Simple next step</dt>
                    <dd className="mt-1 leading-relaxed text-[var(--color-text-secondary)]">
                      Tell us the basics and how you operate. We&apos;ll follow up when we&apos;re ready to publish or
                      need more info.
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
